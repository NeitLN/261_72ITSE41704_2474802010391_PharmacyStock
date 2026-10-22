import {
  Alert,
  Button,
  Descriptions,
  Input,
  InputNumber,
  Space,
  Table,
  Typography,
} from 'antd';
import { useState } from 'react';
import { type FieldError, toApiError } from '../api/errors';
import { formatVnd } from '../api/medicines';
import {
  type ReturnableSale,
  type ReturnLineInput,
  returnsApi,
  type SaleReturn,
} from '../api/returns';
import { lineEstimateXu, xuToVndString } from '../api/sales';
import { wholeNumberError } from '../forms/numberRules';

type LineErrors = Record<string, string>;

const SALE_NOT_FOUND = 'Sale not found';

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

  async function findSale() {
    const number = receiptNumber.trim();
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
      setSearchError(apiError.statusCode === 404 ? SALE_NOT_FOUND : null);
      if (apiError.statusCode !== 404) setTopError(apiError.message);
    } finally {
      setSearching(false);
    }
  }

  function changeQuantity(saleLineId: string, value: number | null) {
    setQuantities((prev) => ({ ...prev, [saleLineId]: value ?? 0 }));
    // The content changed: a request ID kept for the old content would be refused.
    setRequestId(null);
  }

  function changeReason(value: string) {
    setReason(value);
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
    } catch (error) {
      const apiError = toApiError(error);
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
            onPressEnter={findSale}
            aria-label="Receipt number"
          />
          <Button type="primary" loading={searching} onClick={findSale}>
            Find
          </Button>
        </Space.Compact>
        {searchError && (
          <div>
            <Typography.Text type="danger">{searchError}</Typography.Text>
          </div>
        )}
      </div>

      {sale && (
        <>
          <div>
            <Typography.Text strong>
              Lines of {sale.receiptNumber} — sold{' '}
              {new Date(sale.soldAt).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
              {sale.customer ? ` to ${sale.customer.code} — ${sale.customer.fullName}` : ''}
            </Typography.Text>
            <Table
              rowKey="saleLineId"
              size="small"
              pagination={false}
              dataSource={sale.lines}
              style={{ marginTop: 8 }}
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
                        disabled={line.returnable === 0}
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

          <Button
            type="primary"
            size="large"
            loading={submitting}
            onClick={confirmReturn}
          >
            Confirm return
          </Button>
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
  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
      <Descriptions size="small" column={2} title={`Return ${result.referenceNumber}`}>
        <Descriptions.Item label="Returned at">
          {new Date(result.returnedAt).toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          })}
        </Descriptions.Item>
        <Descriptions.Item label="Receipt">
          {result.sale.receiptNumber}
        </Descriptions.Item>
        <Descriptions.Item label="Reason" span={2}>
          {result.reason}
        </Descriptions.Item>
      </Descriptions>
      <Table
        rowKey={(_, index) => String(index)}
        size="small"
        pagination={false}
        dataSource={result.lines}
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
          { title: 'Assessment', dataIndex: 'assessmentStatus' },
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
      <Button type="primary" onClick={onNew}>
        New return
      </Button>
    </Space>
  );
}
