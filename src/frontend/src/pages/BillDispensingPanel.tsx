import { Alert, Button, Space, Table, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { type ApiError, toApiError } from '../api/errors';
import {
  type BillablePrescription,
  type Sale,
  salesApi,
} from '../api/sales';
import { useLoad } from '../api/useLoad';
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
  const { data: prescriptions, loading, reload } = useLoad(
    fetchList,
    NO_BILLABLE,
  );
  const [selected, setSelected] = useState<BillablePrescription | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  function choose(prescription: BillablePrescription) {
    if (paying) return;
    if (selected?.id !== prescription.id) {
      // One request ID per chosen prescription: kept when the cashier retries
      // the payment, replaced when a different prescription is picked (FR-23).
      setRequestId(crypto.randomUUID());
    }
    setSelected(prescription);
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
        setSelected(null);
        setRequestId(null);
        reload();
      }
    } finally {
      setPaying(false);
    }
  }

  function billAnother() {
    setReceipt(null);
    setSelected(null);
    setRequestId(null);
    setTopError(null);
    reload();
  }

  if (receipt) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <ReceiptView
          sale={receipt}
          onNew={billAnother}
          newText="Bill another"
        />
        {receipt.lines.some((line) => line.billed) && (
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Handed over earlier — no stock movement.
          </Typography.Paragraph>
        )}
      </Space>
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography.Text strong>Hand-overs waiting for payment</Typography.Text>
          <Button onClick={reload} loading={loading}>
            Refresh
          </Button>
        </div>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          loading={loading}
          dataSource={prescriptions}
          style={{ marginTop: 8 }}
          locale={{ emptyText: 'No hand-over is waiting for payment.' }}
          onRow={(p) => ({
            onClick: () => choose(p),
            style: {
              cursor: 'pointer',
              // The prescription being paid for is tinted, so the cashier can
              // always see which one the Confirm payment button will charge.
              background: selected?.id === p.id ? '#e6f4ff' : undefined,
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
              title: 'Patient',
              render: (_, p) => `${p.customer.code} — ${p.customer.fullName}`,
            },
            {
              title: 'Last hand-over',
              render: (_, p) =>
                new Date(p.lastDispensedAt).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                }),
            },
            {
              title: 'Lines',
              align: 'right',
              render: (_, p) => p.lines.length,
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
            columns={[
              {
                title: 'Medicine',
                render: (_, l) => `${l.medicine.code} — ${l.medicine.name}`,
              },
              { title: 'Batch', dataIndex: ['batch', 'batchNumber'] },
              { title: 'Expiry', dataIndex: ['batch', 'expiryDate'] },
              { title: 'Quantity', dataIndex: 'quantity', align: 'right' },
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
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

      {topError && <Alert type="error" showIcon message={topError} />}
    </Space>
  );
}
