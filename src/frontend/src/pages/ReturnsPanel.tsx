import {
  Alert,
  Button,
  Descriptions,
  Input,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type SaleSummary, salesApi } from '../api/sales';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { type FieldError, outcomeUnknown, toApiError } from '../api/errors';
import { formatDateTime, formatVnd } from '../ui/format';
import {
  type ReturnableSale,
  type ReturnLineInput,
  returnsApi,
  type SaleReturn,
} from '../api/returns';
import { lineEstimateXu, xuToVndString } from '../api/sales';
import { wholeNumberError } from '../forms/numberRules';
import { STATUSES, type StatusValue, TONE_COLOURS } from '../ui/status';
import { StatusTag } from '../ui/tags';
import { ResultAppear } from './ResultAppear';

type LineErrors = Record<string, string>;

const NO_SALES: SaleSummary[] = [];

const saleNotFound = (number: string) =>
  `No sale has the receipt number ${number}. It looks like RC-20261013-0001; check the printed receipt.`;

/**
 * How a return line's assessment state reads on the slip (ui-design.md §5):
 * the goods wait in quarantine until a manager releases or rejects them.
 * The API sends the lower-case enum value; a value the kit does not know yet
 * still shows its words instead of an empty tag.
 */
function AssessmentTag({ status }: { status: string }) {
  const value = status.toLowerCase();
  if (value in STATUSES.returnAssessment) {
    return (
      <StatusTag kind="returnAssessment" value={value as StatusValue<'returnAssessment'>} />
    );
  }
  return (
    <Tag variant="filled" style={{ ...TONE_COLOURS.neutral, marginInlineEnd: 0 }}>
      {status}
    </Tag>
  );
}

/**
 * Maps `lines.N.quantity` errors back to the sent return lines; N indexes the
 * lines in the order they were sent, which skip lines with nothing to return.
 */
function errorsByLine(
  errors: FieldError[],
  sentLines: ReturnLineInput[],
): LineErrors {
  const byLine: LineErrors = {};
  for (const e of errors) {
    const m = /^lines\.(\d+)\.quantity$/.exec(e.field);
    if (!m) continue;
    const line = sentLines[Number(m[1])];
    if (!line) continue;
    byLine[line.saleLineId] ??= e.message;
  }
  return byLine;
}

/** Estimated refund in whole xu, as bigint (TC-52), never with floats. */
function estimateXu(sale: ReturnableSale, quantities: Record<string, number>) {
  return sale.lines.reduce((sum, line) => {
    const quantity = quantities[line.saleLineId] ?? 0;
    if (!Number.isInteger(quantity) || quantity <= 0) return sum;
    return sum + lineEstimateXu(line.unitPrice, quantity);
  }, 0n);
}

/**
 * UC08 process a return: find the sale by receipt number, enter the quantity to
 * return per line and a reason, confirm. The goods go to quarantine (DEC-04,
 * BR11), so the screen never claims they are back on the shelf.
 */
export function ReturnsPanel() {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState<ReturnableSale | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantityErrors, setQuantityErrors] = useState<LineErrors>({});
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SaleReturn | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  // FR-23: a lost answer may mean the return was saved; only a retry with the same ID is allowed.
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const locked = submitting || unknownOutcome;

  // Today's sales, so a return or a doubtful payment can be found without typing a number.
  const fetchToday = useCallback(() => salesApi.list(), []);
  const { data: todaysSales, loading: todayLoading, error: todayError, reload: reloadToday } = useLoad(
    fetchToday,
    NO_SALES,
  );

  // "Return items" on a receipt opens this tab with the receipt number filled in and found.
  const [searchParams] = useSearchParams();
  const fromReceipt = searchParams.get('receipt');
  useEffect(() => {
    if (fromReceipt) {
      setReceiptNumber(fromReceipt);
      void findSale(fromReceipt);
    }
    // Only when the tab opens with a receipt number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromReceipt]);

  async function findSale(typed: string = receiptNumber) {
    if (locked) return;
    const number = typed.trim();
    if (!number) {
      setSearchError('Enter the receipt number.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setTopError(null);
    try {
      const found = await returnsApi.findSale(number);
      setSale(found);
      setQuantities({});
      setQuantityErrors({});
      setReason('');
      setReasonError(null);
      setResult(null);
      // One request ID per found sale; retrying the same content keeps it (FR-23).
      setRequestId(crypto.randomUUID());
    } catch (error) {
      const apiError = toApiError(error);
      setSale(null);
      setTopError(null);
      setSearchError(apiError.statusCode === 404 ? saleNotFound(number) : null);
      if (apiError.statusCode !== 404) setTopError(apiError.message);
    } finally {
      setSearching(false);
    }
  }

  function changeQuantity(saleLineId: string, value: number | null) {
    setQuantities((prev) => ({ ...prev, [saleLineId]: value ?? 0 }));
    // The edited line's error no longer applies, and a top error about the
    // previous attempt would be stale.
    setQuantityErrors((prev) => {
      if (!(saleLineId in prev)) return prev;
      const next = { ...prev };
      delete next[saleLineId];
      return next;
    });
    setTopError(null);
    // The content changed: a request ID kept for the old content would be refused.
    setRequestId(null);
  }

  function changeReason(value: string) {
    setReason(value);
    setReasonError(null);
    setTopError(null);
    setRequestId(null);
  }

  async function confirmReturn() {
    if (!sale) return;
    // Clients check numbers first (#127): a bad value never reaches the server.
    const typeErrors: LineErrors = {};
    for (const line of sale.lines) {
      const error = wholeNumberError(
        'Quantity',
        quantities[line.saleLineId] ?? 0,
        { min: 0, max: line.returnable },
      );
      if (error) typeErrors[line.saleLineId] = error;
    }
    setQuantityErrors(typeErrors);

    const trimmed = reason.trim();
    const reasonProblem =
      trimmed.length < 3
        ? 'Reason must be at least 3 characters.'
        : trimmed.length > 500
          ? 'Reason must be at most 500 characters.'
          : null;
    setReasonError(reasonProblem);
    if (Object.keys(typeErrors).length > 0 || reasonProblem) return;

    const sentLines = sale.lines
      .filter((line) => (quantities[line.saleLineId] ?? 0) > 0)
      .map((line) => ({
        saleLineId: line.saleLineId,
        quantity: quantities[line.saleLineId],
      }));
    if (sentLines.length === 0) {
      setTopError('Enter a quantity to return on at least one line.');
      return;
    }

    const rid = requestId ?? crypto.randomUUID();
    setRequestId(rid);
    setSubmitting(true);
    setTopError(null);
    try {
      const done = await returnsApi.create({
        requestId: rid,
        saleId: sale.id,
        reason: trimmed,
        lines: sentLines,
      });
      setResult(done);
      setRequestId(null);
      setUnknownOutcome(false);
    } catch (error) {
      const apiError = toApiError(error);
      if (outcomeUnknown(apiError)) {
        setUnknownOutcome(true);
        setTopError(apiError.message);
        return;
      }
      setUnknownOutcome(false);
      const lineErrors = errorsByLine(apiError.errors, sentLines);
      setQuantityErrors(lineErrors);
      const reasonMessage = apiError.errors.find(
        (e) => e.field === 'reason',
      )?.message;
      setReasonError(reasonMessage ?? null);
      // Anything that is neither a sent line nor the reason goes to the alert.
      const unplaced = apiError.errors.some(
        (e) => e.field !== 'reason' && !/^lines\.\d+\.quantity$/.test(e.field),
      );
      const manyLineErrors =
        Object.keys(lineErrors).length <
        apiError.errors.filter((e) => /^lines\.\d+\.quantity$/.test(e.field))
          .length;
      setTopError(unplaced || manyLineErrors ? apiError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  function newReturn() {
    setReceiptNumber('');
    setSearchError(null);
    setSale(null);
    setQuantities({});
    setQuantityErrors({});
    setReason('');
    setReasonError(null);
    setRequestId(null);
    setResult(null);
    setTopError(null);
    setUnknownOutcome(false);
  }

  if (result) {
    return <ReturnResultView result={result} onNew={newReturn} />;
  }

  const totalXu = sale ? estimateXu(sale, quantities) : 0n;

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="large">
      <div>
        <Typography.Text strong>Find the sale by its receipt number</Typography.Text>
        <Space.Compact style={{ width: '100%', maxWidth: 480, marginTop: 8 }}>
          <Input
            placeholder="Receipt number, e.g. RC-20261013-0001"
            value={receiptNumber}
            onChange={(e) => {
              setReceiptNumber(e.target.value);
              setSearchError(null);
            }}
            onPressEnter={() => void findSale()}
            disabled={locked}
            aria-label="Receipt number"
          />
          <Button type="primary" loading={searching} disabled={locked} onClick={() => void findSale()}>
            Find
          </Button>
        </Space.Compact>
        {searchError && (
          <div>
            <Typography.Text type="danger">{searchError}</Typography.Text>
          </div>
        )}
      </div>

      {!sale && (
        <div>
          <Typography.Text strong>Today's sales</Typography.Text>
          {todayError && <LoadFailed error={todayError} onRetry={reloadToday} />}
          <Table
            rowKey="id"
            size="small"
            style={{ marginTop: 8 }}
            loading={todayLoading}
            dataSource={todaysSales}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: 'No sale yet today.' }}
            columns={[
              { title: 'Receipt', dataIndex: 'receiptNumber', className: 'nowrap' },
              { title: 'Sold at', className: 'nowrap', render: (_, r) => formatDateTime(r.soldAt) },
              {
                title: 'Customer',
                render: (_, r) => (r.customer ? `${r.customer.code} — ${r.customer.fullName}` : '—'),
              },
              { title: 'Lines', dataIndex: 'lineCount', align: 'right' },
              {
                title: 'Total',
                align: 'right',
                className: 'nowrap',
                render: (_, r) => formatVnd(r.totalAmount),
              },
              {
                title: '',
                render: (_, r) => (
                  <Button
                    size="small"
                    disabled={locked}
                    aria-label={`Return items of ${r.receiptNumber}`}
                    onClick={() => {
                      setReceiptNumber(r.receiptNumber);
                      void findSale(r.receiptNumber);
                    }}
                  >
                    Return items
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}

      {sale && (
        <>
          <div>
            <Typography.Text strong>
              Lines of {sale.receiptNumber} — sold{' '}
              {formatDateTime(sale.soldAt)}
              {sale.customer ? ` to ${sale.customer.code} — ${sale.customer.fullName}` : ''}
            </Typography.Text>
            <Table
              rowKey="saleLineId"
              size="small"
              pagination={false}
              dataSource={sale.lines}
              style={{ marginTop: 8 }}
              locale={{ emptyText: 'This sale has no line that can be returned.' }}
              columns={[
                {
                  title: 'Medicine',
                  render: (_, line) => (
                    <div>
                      {line.medicine.code} — {line.medicine.name}
                      {line.billed && (
                        <div>
                          <Typography.Text type="secondary">
                            From a hand-over
                          </Typography.Text>
                        </div>
                      )}
                    </div>
                  ),
                },
                { title: 'Batch', dataIndex: ['batch', 'batchNumber'] },
                { title: 'Expiry', dataIndex: ['batch', 'expiryDate'] },
                { title: 'Sold', dataIndex: 'quantitySold', align: 'right' },
                { title: 'Returned', dataIndex: 'quantityReturned', align: 'right' },
                { title: 'Returnable', dataIndex: 'returnable', align: 'right' },
                {
                  title: 'Unit price',
                  align: 'right',
                  render: (_, line) => formatVnd(line.unitPrice),
                },
                {
                  title: 'Quantity to return',
                  align: 'right',
                  render: (_, line) => (
                    <div>
                      <InputNumber<number>
                        disabled={line.returnable === 0 || locked}
                        value={quantities[line.saleLineId] ?? 0}
                        onChange={(v) => changeQuantity(line.saleLineId, v)}
                        aria-label={`Quantity to return of ${line.medicine.name}`}
                        style={{ width: 110 }}
                      />
                      {quantityErrors[line.saleLineId] && (
                        <div>
                          <Typography.Text type="danger">
                            {quantityErrors[line.saleLineId]}
                          </Typography.Text>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <div>
            <Typography.Text strong>Reason</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Input.TextArea
                rows={2}
                placeholder="Why the customer brings the goods back (3–500 characters)"
                value={reason}
                onChange={(e) => changeReason(e.target.value)}
                disabled={locked}
                aria-label="Reason for the return"
                style={{ maxWidth: 640 }}
              />
            </div>
            {reasonError && (
              <div>
                <Typography.Text type="danger">{reasonError}</Typography.Text>
              </div>
            )}
          </div>

          <Typography.Text strong style={{ fontSize: 16 }}>
            Estimated refund: {formatVnd(xuToVndString(totalXu))}
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Estimate — the return slip shows the refund, at the price paid on the
            sale. The goods go to quarantine, not back on the shelf.
          </Typography.Paragraph>

          {unknownOutcome && (
            <Alert
              type="warning"
              showIcon
              title="We do not know whether this return was recorded."
              description="Retry sends the same request: if it was already recorded you get its slip, otherwise it is recorded once now. Nothing can be changed until then."
            />
          )}
          <Space>
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={confirmReturn}
            >
              {unknownOutcome ? 'Retry the return' : 'Confirm return'}
            </Button>
            {unknownOutcome && (
              <Button size="large" disabled={submitting} onClick={newReturn}>
                Start over
              </Button>
            )}
          </Space>
        </>
      )}

      {topError && <Alert type="error" showIcon title={topError} />}
      {requestId && (
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          Retrying sends the same request, so a network failure can never record
          the return twice.
        </Typography.Paragraph>
      )}
    </Space>
  );
}

function ReturnResultView({
  result,
  onNew,
}: {
  result: SaleReturn;
  onNew: () => void;
}) {
  const printedAt = useRef<HTMLSpanElement>(null);

  function print() {
    if (printedAt.current) printedAt.current.textContent = formatDateTime(new Date().toISOString());
    window.print();
  }

  return (
    <ResultAppear>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div className="print-area">
          <div className="print-only">
            <Typography.Title level={4} style={{ margin: 0 }}>
              LotOrder
            </Typography.Title>
            <Typography.Text>
              Printed <span ref={printedAt} />
            </Typography.Text>
          </div>
          <Descriptions size="small" column={2} title={`Return ${result.referenceNumber}`}>
            <Descriptions.Item label="Returned at">
              {formatDateTime(result.returnedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Receipt">
              {result.sale.receiptNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Reason" span={2}>
              {result.reason}
            </Descriptions.Item>
          </Descriptions>
          <Table
            rowKey="saleLineId"
            size="small"
            pagination={false}
            dataSource={result.lines}
            locale={{ emptyText: 'This return has no line.' }}
            columns={[
              {
                title: 'Medicine',
                render: (_, line) => `${line.medicine.code} — ${line.medicine.name}`,
              },
              { title: 'Batch', dataIndex: ['batch', 'batchNumber'] },
              { title: 'Expiry', dataIndex: ['batch', 'expiryDate'] },
              { title: 'Quantity', dataIndex: 'quantity', align: 'right' },
              {
                title: 'Unit price',
                align: 'right',
                render: (_, line) => formatVnd(line.unitPrice),
              },
              {
                title: 'Refund',
                align: 'right',
                render: (_, line) => formatVnd(line.refund),
              },
              {
                title: 'Assessment',
                render: (_, line) => (
                  <AssessmentTag status={line.assessmentStatus} />
                ),
              },
            ]}
          />
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Refund total">
              {formatVnd(result.refundAmount)}
            </Descriptions.Item>
          </Descriptions>
          <Alert
            type="warning"
            showIcon
            title="Goods are in quarantine, waiting for a manager's assessment."
          />
        </div>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={print}>
            Print
          </Button>
          <Button type="primary" onClick={onNew}>
            New return
          </Button>
        </Space>
      </Space>
    </ResultAppear>
  );
}
