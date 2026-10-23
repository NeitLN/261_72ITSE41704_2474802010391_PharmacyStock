import {
  Alert,
  App,
  Button,
  Descriptions,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { type FieldError, toApiError } from '../api/errors';
import { medicinesApi, type Medicine } from '../api/medicines';
import { formatVnd } from '../ui/format';
import {
  lineEstimateXu,
  type Sale,
  salesApi,
  xuToVndString,
} from '../api/sales';
import { useLoad } from '../api/useLoad';

const NO_OTC: Medicine[] = [];

interface CartLine {
  medicineId: string;
  code: string;
  name: string;
  /** Price in force, decimal string from UC01 (e.g. "2200.00"). */
  unitPrice: string;
  quantity: number;
}

type LineErrors = Record<string, string>;

/**
 * Maps `otcLines.N.medicineId` / `otcLines.N.quantity` errors back to the sent
 * cart lines; N indexes the lines in the order they were sent.
 */
function errorsByLine(errors: FieldError[], sentLines: CartLine[]): LineErrors {
  const byLine: LineErrors = {};
  for (const e of errors) {
    const m = /^otcLines\.(\d+)\.(medicineId|quantity)$/.exec(e.field);
    if (!m) continue;
    const line = sentLines[Number(m[1])];
    if (!line) continue;
    byLine[line.medicineId] ??= e.message;
  }
  return byLine;
}

/**
 * The reason box of "Cancel the cart". Controlled, so a modal.update of the
 * OK-button state cannot wipe what was typed.
 */
function CancelReason({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Input
      placeholder="Cancellation reason"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      aria-label="Cancellation reason"
    />
  );
}

/**
 * UC07 over-the-counter cart: pick OTC medicines, quantities, live estimate,
 * cancel with a reason, pay. Stock and receipt come from the server only;
 * the payment generates one request ID and retries reuse it (FR-23).
 */
export function SalesCartPanel() {
  const { message, modal } = App.useApp();
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<LineErrors>({});

  const fetchOptions = useCallback(() => medicinesApi.list({}), []);
  const { data: medicines } = useLoad(fetchOptions, NO_OTC);
  const otc = useMemo(
    () =>
      medicines
        .filter((m) => m.isActive && m.classification === 'otc')
        .sort((a, b) => a.code.localeCompare(b.code)),
    [medicines],
  );

  const estimatedTotalXu = cart.reduce(
    (sum, c) => sum + lineEstimateXu(c.unitPrice, c.quantity),
    0n,
  );

  function addMedicine(id: string) {
    const m = otc.find((x) => x.id === id);
    if (!m || m.currentPrice === null) return;
    const price: string = m.currentPrice;
    setCart((prev) => {
      const existing = prev.find((c) => c.medicineId === id);
      if (existing) {
        // The same medicine again: one line, quantities add up.
        return prev.map((c) =>
          c.medicineId === id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          medicineId: m.id,
          code: m.code,
          name: m.name,
          unitPrice: price,
          quantity: 1,
        },
      ];
    });
    // The cart changed: a stale request ID must never be reused (FR-23).
    setRequestId(null);
    setLineErrors({});
    setTopError(null);
    setPickedId(undefined);
  }

  function changeQuantity(medicineId: string, quantity: number) {
    setCart((prev) =>
      prev.map((c) => (c.medicineId === medicineId ? { ...c, quantity } : c)),
    );
    setRequestId(null);
    // The cart changed, so previous placement errors no longer apply.
    setTopError(null);
    setLineErrors({});
  }

  function removeLine(medicineId: string) {
    setCart((prev) => prev.filter((c) => c.medicineId !== medicineId));
    setRequestId(null);
    setTopError(null);
    setLineErrors({});
  }

  function confirmCancelCart() {
    if (cart.length === 0) return;
    let reason = '';
    let okEnabled = false;
    // A8 / TC-59: the reason is mandatory; nothing is sent to the server.
    const handle = modal.confirm({
      title: 'Cancel the cart?',
      content: (
        <div style={{ marginTop: 8 }}>
          <Typography.Paragraph type="secondary">
            Nothing was saved — bill and stock are untouched.
          </Typography.Paragraph>
          <CancelReason
            onChange={(v) => {
              reason = v;
              const enabled = v.trim().length > 0;
              if (enabled !== okEnabled) {
                okEnabled = enabled;
                handle?.update({
                  okButtonProps: { danger: true, disabled: !enabled },
                });
              }
            }}
          />
        </div>
      ),
      okText: 'Cancel cart',
      okButtonProps: { danger: true, disabled: true },
      onOk: () => {
        if (!reason.trim()) {
          return Promise.reject(new Error('A reason is required.'));
        }
        setCart([]);
        setRequestId(null);
        setTopError(null);
        setLineErrors({});
        message.info('Cart cancelled — nothing was saved.');
      },
    });
  }

  async function pay() {
    if (cart.length === 0) return;
    // One request ID per cart; a retry resends the same one (FR-23).
    const rid = requestId ?? crypto.randomUUID();
    setRequestId(rid);
    setPaying(true);
    setTopError(null);
    setLineErrors({});
    try {
      const sale = await salesApi.create({
        requestId: rid,
        otcLines: cart.map((c) => ({
          medicineId: c.medicineId,
          quantity: c.quantity,
        })),
      });
      setReceipt(sale);
      setCart([]);
      setRequestId(null);
    } catch (error) {
      const apiError = toApiError(error);
      setLineErrors(errorsByLine(apiError.errors, cart));
      setTopError(apiError.message);
    } finally {
      setPaying(false);
    }
  }

  function resetAll() {
    setPickedId(undefined);
    setCart([]);
    setRequestId(null);
    setReceipt(null);
    setTopError(null);
    setLineErrors({});
  }

  if (receipt) {
    return <ReceiptView sale={receipt} onNew={resetAll} />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div>
        <Typography.Text strong>Add a medicine to the cart</Typography.Text>
        <Select
          showSearch
          optionFilterProp="label"
          // `null` (not undefined) so antd really clears the picker after
          // every pick; onSelect (not onChange) because picking the same
          // medicine twice in a row must still merge quantities.
          value={pickedId ?? null}
          onSelect={addMedicine}
          placeholder="Search by code or name"
          notFoundContent="No OTC medicine matches"
          style={{ width: '100%', maxWidth: 480, marginTop: 8 }}
          options={otc.map((m) => ({
            value: m.id,
            label:
              m.currentPrice === null
                ? `${m.code} — ${m.name} — no price in force`
                : `${m.code} — ${m.name}`,
            disabled: m.currentPrice === null,
          }))}
        />
      </div>

      {cart.length === 0 ? (
        <Typography.Text type="secondary">The cart is empty.</Typography.Text>
      ) : (
        <>
          <div>
            <Typography.Text strong>Cart</Typography.Text>
            <Table
              rowKey="medicineId"
              size="small"
              pagination={false}
              dataSource={cart}
              style={{ marginTop: 8 }}
              columns={[
                {
                  title: 'Medicine',
                  render: (_, c) => `${c.code} — ${c.name}`,
                },
                {
                  title: 'Price',
                  align: 'right',
                  render: (_, c) => formatVnd(c.unitPrice),
                },
                {
                  title: 'Quantity',
                  align: 'right',
                  render: (_, c) => (
                    <div>
                      <InputNumber<number>
                        min={1}
                        precision={0}
                        value={c.quantity}
                        onChange={(v) => changeQuantity(c.medicineId, v ?? 1)}
                        aria-label={`Quantity of ${c.name}`}
                        style={{ width: 90 }}
                      />
                      {lineErrors[c.medicineId] && (
                        <div>
                          <Typography.Text type="danger">
                            {lineErrors[c.medicineId]}
                          </Typography.Text>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  title: 'Line total',
                  align: 'right',
                  render: (_, c) =>
                    formatVnd(xuToVndString(lineEstimateXu(c.unitPrice, c.quantity))),
                },
                {
                  title: '',
                  align: 'right',
                  render: (_, c) => (
                    <Button
                      type="text"
                      danger
                      onClick={() => removeLine(c.medicineId)}
                      aria-label={`Remove ${c.name} from the cart`}
                    >
                      Remove
                    </Button>
                  ),
                },
              ]}
            />
            <Typography.Text strong style={{ fontSize: 16 }}>
              Estimated total: {formatVnd(xuToVndString(estimatedTotalXu))}
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              Estimate — the receipt shows the total charged.
            </Typography.Paragraph>
          </div>
          <Space>
            <Button type="primary" size="large" loading={paying} onClick={pay}>
              Pay
            </Button>
            <Button danger size="large" onClick={confirmCancelCart}>
              Cancel cart
            </Button>
          </Space>
        </>
      )}

      {topError && <Alert type="error" showIcon message={topError} />}
      {requestId && (
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          Retrying sends the same request, so a network failure can never
          charge twice.
        </Typography.Paragraph>
      )}
    </Space>
  );
}

function ReceiptView({ sale, onNew }: { sale: Sale; onNew: () => void }) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Descriptions size="small" title={`Receipt ${sale.receiptNumber}`}>
        <Descriptions.Item label="Sold at">
          {new Date(sale.soldAt).toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          })}
        </Descriptions.Item>
        <Descriptions.Item label="Customer">
          {sale.customer ? `${sale.customer.code} — ${sale.customer.fullName}` : '—'}
        </Descriptions.Item>
      </Descriptions>
      <Table
        rowKey={(_, index) => String(index)}
        size="small"
        pagination={false}
        dataSource={sale.lines}
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
            render: (_, l) => formatVnd(l.unitPrice),
          },
          {
            title: 'Line total',
            align: 'right',
            render: (_, l) => formatVnd(l.lineTotal),
          },
        ]}
      />
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Total">
          {formatVnd(sale.totalAmount)}
        </Descriptions.Item>
      </Descriptions>
      <Button type="primary" onClick={onNew}>
        New sale
      </Button>
    </Space>
  );
}
