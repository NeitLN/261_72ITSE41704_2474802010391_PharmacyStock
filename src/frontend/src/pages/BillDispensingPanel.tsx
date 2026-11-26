import { Alert, Button, Space, Table, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { type ApiError, toApiError } from '../api/errors';
import {
  type BillablePrescription,
  type Sale,
  salesApi,
} from '../api/sales';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { formatDateTime, formatVnd } from '../ui/format';
import { ReceiptView } from './SalesCartPanel';

const NO_BILLABLE: BillablePrescription[] = [];

/**
 * S12: the server refuses to bill the same hand-over twice — 422 with
 * `code: 'ALREADY_BILLED'`.
 */
function isAlreadyBilled(error: ApiError): boolean {
  return error.statusCode === 422 && error.code === 'ALREADY_BILLED';
}

/**
 * UC07 billing a dispensing: the cashier picks a hand-over already made in
 * UC06 and pays for it. The payment records money only — the stock left the
 * shelf at the hand-over (DEC-05, FR-26), so this screen never shows or
 * changes quantities in stock, and the server moves none.
 */
export function BillDispensingPanel() {
  const fetchList = useCallback(() => salesApi.billable(), []);
  const { data: prescriptions, loading, error: loadError, reload, refreshQuietly } = useLoad(
    fetchList,
    NO_BILLABLE,
  );
  // Only the id is kept: the lines shown always come from the latest list, so
  // after Refresh the cashier sees exactly what the server will bill.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = prescriptions.find((p) => p.id === selectedId) ?? null;
  const [requestId, setRequestId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  // New hand-overs arrive while the cashier waits: refresh every 15 s and when the
  // window comes back, quietly (no spinner), but never while a payment is on its way.
  useEffect(() => {
    if (paying || receipt) return undefined;
    const refresh = () => refreshQuietly();
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
    // refreshQuietly is a new function each render; the timer only needs the two states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paying, receipt]);

  function choose(prescription: BillablePrescription) {
    if (paying) return;
    if (selectedId !== prescription.id) {
      // One request ID per chosen prescription: kept when the cashier retries
      // the payment, replaced when a different prescription is picked (FR-23).
      setRequestId(crypto.randomUUID());
    }
    setSelectedId(prescription.id);
    setTopError(null);
  }

  async function confirmPayment() {
    if (!selected || !requestId) return;
    setPaying(true);
    setTopError(null);
    try {
      const sale = await salesApi.create({
        requestId,
        prescriptionId: selected.id,
      });
      setReceipt(sale);
      setRequestId(null);
    } catch (error) {
      const apiError = toApiError(error);
      setTopError(apiError.message);
      if (isAlreadyBilled(apiError)) {
        // S12: it is paid for now, so it must disappear from the list.
        setSelectedId(null);
        setRequestId(null);
        reload();
      }
    } finally {
      setPaying(false);
    }
  }

  function billAnother() {
    setReceipt(null);
    setSelectedId(null);
    setRequestId(null);
    setTopError(null);
    reload();
  }

  if (receipt) {
    return (
      <Space orientation="vertical" style={{ width: '100%' }}>
        <ReceiptView
          sale={receipt}
          onNew={billAnother}
          newText="Bill another"
        />
        {receipt.lines.some((line) => line.billed) && (
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Dispensed earlier — no stock movement.
          </Typography.Paragraph>
        )}
      </Space>
    );
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="large">
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography.Text strong>Dispensed prescriptions waiting for payment</Typography.Text>
          <Button onClick={reload} loading={loading} disabled={paying}>
            Refresh
          </Button>
        </div>
        {loadError && <LoadFailed error={loadError} onRetry={reload} />}
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          loading={{ spinning: loading, delay: 300 }}
          dataSource={prescriptions}
          style={{ marginTop: 8 }}
          locale={{ emptyText: 'No dispensed prescription is waiting for payment. New ones appear here by themselves.' }}
          onRow={(p) => ({
            onClick: () => choose(p),
            style: {
              cursor: 'pointer',
              // The prescription being paid for is tinted, so the cashier can
              // always see which one the Confirm payment button will charge.
              background: selectedId === p.id ? '#e6f4ff' : undefined,
            },
          })}
          columns={[
            {
              title: 'Prescription',
              render: (_, p) => (
                <Button
                  type="link"
                  aria-label={`Bill ${p.referenceNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    choose(p);
                  }}
                >
                  {p.referenceNumber}
                </Button>
              ),
            },
            {
              title: 'Customer',
              render: (_, p) => `${p.customer.code} — ${p.customer.fullName}`,
            },
            {
              title: 'Last dispensed',
              render: (_, p) => formatDateTime(p.lastDispensedAt),
            },
            {
              title: 'Lines',
              align: 'right',
              render: (_, p) => p.lines.length,
            },
            {
              title: 'To pay',
              align: 'right',
              render: (_, p) => (p.totalAmount ? formatVnd(p.totalAmount) : '—'),
            },
          ]}
        />
      </div>

      {selected && (
        <div>
          <Typography.Text strong>
            Lines of {selected.referenceNumber} to pay for now
          </Typography.Text>
          <Table
            rowKey="dispenseLineId"
            size="small"
            pagination={false}
            dataSource={selected.lines}
            style={{ marginTop: 8 }}
            locale={{ emptyText: 'This bill has no line to pay for.' }}
            columns={[
              {
                title: 'Medicine',
                render: (_, l) => `${l.medicine.code} — ${l.medicine.name}`,
              },
              { title: 'Batch', dataIndex: ['batch', 'batchNumber'] },
              { title: 'Expiry', dataIndex: ['batch', 'expiryDate'] },
              { title: 'Quantity', dataIndex: 'quantity', align: 'right' },
              {
                title: 'Unit price',
                align: 'right',
                render: (_, l) => (l.unitPrice ? formatVnd(l.unitPrice) : 'No price'),
              },
              {
                title: 'Line total',
                align: 'right',
                render: (_, l) => (l.lineTotal ? formatVnd(l.lineTotal) : '—'),
              },
            ]}
          />
          <Typography.Text strong style={{ fontSize: 16, display: 'block', marginTop: 8 }}>
            Total to pay: {selected.totalAmount ? formatVnd(selected.totalAmount) : '—'}
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Prices are those in force today; the receipt shows the total
            charged.
          </Typography.Paragraph>
          <Button
            type="primary"
            size="large"
            loading={paying}
            onClick={confirmPayment}
            style={{ marginTop: 12 }}
          >
            Confirm payment
          </Button>
          {requestId && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              Retrying sends the same request, so a network failure can never
              charge twice.
            </Typography.Paragraph>
          )}
        </div>
      )}

      {topError && <Alert type="error" showIcon title={topError} />}
    </Space>
  );
}
