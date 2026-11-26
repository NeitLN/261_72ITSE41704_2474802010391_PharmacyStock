import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { decimal, parseGroupedNumber, wholeNumber } from '../forms/numberRules';
import { expiryInfo } from '../ui/expiry';
import {
  type GoodsReceipt,
  type GoodsReceiptInput,
  type GoodsReceiptSummary,
  goodsReceiptsApi,
} from '../api/goodsReceipts';
import { type Medicine, medicinesApi } from '../api/medicines';
import { formatDateTime, formatVnd } from '../ui/format';
import { TONE_COLOURS } from '../ui/status';
import { type Supplier, suppliersApi } from '../api/suppliers';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { useBusinessToday } from '../api/clock';
import { DateField } from '../forms/DateField';
import { matchesLabel } from '../ui/search';

const NO_RECEIPTS: GoodsReceiptSummary[] = [];
const NO_MEDICINES: Medicine[] = [];
const NO_SUPPLIERS: Supplier[] = [];

/** The API accepts at most this many lines per receipt. */
const MAX_LINES = 100;

/** UC03 Record a goods receipt: the list, the entry form and the details. */
export function GoodsReceiptsPanel() {
  // Read early, so a form opened from here starts on the server's date (#255).
  useBusinessToday();
  const { message } = App.useApp();
  const [recording, setRecording] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: receipts, loading, error: loadError, reload } = useLoad(goodsReceiptsApi.list, NO_RECEIPTS);

  const columns: ColumnsType<GoodsReceiptSummary> = [
    { title: 'Receipt date', dataIndex: 'receiptDate', width: 130, className: 'nowrap' },
    { title: 'Document', dataIndex: 'documentNumber', width: 160, className: 'nowrap' },
    {
      title: 'Supplier',
      render: (_, r) => (
        <>
          {r.supplier.name}{' '}
          {r.reversed && (
            <Tag variant="filled" style={{ ...TONE_COLOURS.neutral, marginInlineEnd: 0 }}>
              Reversed
            </Tag>
          )}
        </>
      ),
    },
    { title: 'Lines', dataIndex: 'lineCount', width: 80, align: 'right' },
    {
      title: 'Total cost',
      dataIndex: 'totalCost',
      width: 160,
      align: 'right',
      className: 'nowrap',
      render: (v: string) => formatVnd(v),
    },
    {
      title: '',
      key: 'open',
      width: 90,
      render: (_, r) => (
        <Button size="small" onClick={() => setOpenId(r.id)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          Each line creates or tops up a batch and adds its quantity to sellable stock.
          A saved goods receipt is never edited. A wrong one is reversed from its details while
          none of its stock has left; after that, a wrong quantity is corrected with a stock take.
        </Typography.Paragraph>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecording(true)}>
          Record goods receipt
        </Button>
      </Space>
      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={receipts}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No goods receipts yet.' }}
        style={{ marginTop: 16 }}
      />
      {recording && (
        <ReceiptFormModal
          onClose={() => setRecording(false)}
          onSaved={(saved) => {
            message.success(
              `Goods receipt ${saved.documentNumber} recorded: ${saved.lines.length} ${saved.lines.length === 1 ? 'line' : 'lines'}.`,
            );
            setRecording(false);
            reload();
            setOpenId(saved.id);
          }}
        />
      )}
      {openId && (
        <ReceiptDetailsModal id={openId} onClose={() => setOpenId(null)} onReversed={reload} />
      )}
    </>
  );
}

const EMPTY_LINE = { batchNumber: '', expiryDate: '', quantity: undefined, unitCost: undefined };

function ReceiptFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (saved: GoodsReceipt) => void;
}) {
  const today = useBusinessToday();
  const { modal } = App.useApp();
  const [form] = Form.useForm<GoodsReceiptInput>();
  const receiptDate = Form.useWatch('receiptDate', form) ?? today;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const lines = Form.useWatch('lines', form) ?? [];

  const fetchSuppliers = useCallback(() => suppliersApi.list({}), []);
  const fetchMedicines = useCallback(() => medicinesApi.list({}), []);
  const { data: suppliers } = useLoad(fetchSuppliers, NO_SUPPLIERS);
  const { data: medicines } = useLoad(fetchMedicines, NO_MEDICINES);

  // Whole cents, so the preview matches the server total exactly.
  const totalCents = lines.reduce(
    (sum, l) =>
      sum + (l?.quantity ?? 0) * Math.round((l?.unitCost ?? 0) * 100),
    0,
  );

  const medicineOf = (id: string | undefined) => medicines.find((m) => m.id === id);
  const lineCents = (l: { quantity?: number; unitCost?: number } | undefined) =>
    Number.isFinite(l?.quantity) && Number.isFinite(l?.unitCost)
      ? (l?.quantity ?? 0) * Math.round((l?.unitCost ?? 0) * 100)
      : null;

  /**
   * A saved receipt can never be changed, so every line is read back first:
   * medicine, batch, expiry, quantity with its unit, unit cost and line total.
   * A cost typed a thousand times too small shows up here, not in stock.
   */
  function confirmSave(values: GoodsReceiptInput) {
    const supplier = suppliers.find((s) => s.id === values.supplierId);
    modal.confirm({
      title: `Save goods receipt ${values.documentNumber}?`,
      width: 820,
      okText: 'Save goods receipt',
      cancelText: 'Go back and edit',
      content: (
        <>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            {supplier?.name ?? '—'} · received {values.receiptDate}. A saved goods receipt
            cannot be changed.
          </Typography.Paragraph>
          <Table
            size="small"
            pagination={false}
            rowKey={(_, i) => String(i)}
            dataSource={values.lines}
            columns={[
              { title: 'Medicine', render: (_, l) => medicineOf(l.medicineId)?.name ?? '—' },
              { title: 'Batch', dataIndex: 'batchNumber', className: 'nowrap' },
              { title: 'Expiry', dataIndex: 'expiryDate', className: 'nowrap' },
              {
                title: 'Quantity',
                align: 'right',
                className: 'nowrap',
                render: (_, l) => `${l.quantity} ${medicineOf(l.medicineId)?.baseUnit.name ?? ''}`,
              },
              {
                title: 'Unit cost',
                align: 'right',
                className: 'nowrap',
                render: (_, l) => formatVnd(String(l.unitCost)),
              },
              {
                title: 'Line total',
                align: 'right',
                className: 'nowrap',
                render: (_, l) => formatVnd(((lineCents(l) ?? 0) / 100).toFixed(2)),
              },
            ]}
          />
          <Typography.Paragraph strong style={{ textAlign: 'right', margin: '8px 0 0' }}>
            Total cost {formatVnd((totalCents / 100).toFixed(2))}
          </Typography.Paragraph>
        </>
      ),
      onOk: () => submit(values),
    });
  }

  async function submit(values: GoodsReceiptInput) {
    setSaving(true);
    setFormError(null);
    try {
      onSaved(await goodsReceiptsApi.create(values));
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Record goods receipt"
      okText="Review and save"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={1080}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={confirmSave}
        initialValues={{ receiptDate: today, lines: [EMPTY_LINE] }}
        // Frozen while saving, so an error for line N still means the line sent.
        disabled={saving}
      >
        <Space align="start" wrap>
          <Form.Item
            name="supplierId"
            label="Supplier"
            rules={[{ required: true, message: 'Choose a supplier.' }]}
          >
            <Select
              showSearch
              filterOption={matchesLabel}
              style={{ width: 280 }}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item
            name="documentNumber"
            label="Supplier document no."
            rules={[{ required: true, whitespace: true, message: 'Document number is required.' }]}
          >
            <Input maxLength={50} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="receiptDate"
            label="Receipt date"
            rules={[{ required: true, message: 'Receipt date is required.' }]}
          >
            <DateField max={today} style={{ width: 170 }} />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input maxLength={500} style={{ width: 300 }} />
          </Form.Item>
        </Space>

        <Typography.Paragraph type="secondary">
          Expiry: if the label shows only month and year, enter the last day of that month.
        </Typography.Paragraph>
        <Form.List name="lines">
          {(fields, { add, remove }, { errors }) => (
            <div style={{ marginTop: 8 }}>
              {fields.map((field, index) => (
                <Space key={field.key} align="start" wrap style={{ display: 'flex' }}>
                  <Form.Item
                    name={[field.name, 'medicineId']}
                    label={index === 0 ? 'Medicine' : undefined}
                    rules={[{ required: true, message: 'Choose a medicine.' }]}
                  >
                    <Select
                      showSearch
                      filterOption={matchesLabel}
                      placeholder="Medicine"
                      aria-label={`Line ${index + 1} medicine`}
                      style={{ width: 300 }}
                      options={medicines.map((m) => ({
                        value: m.id,
                        label: `${m.code} — ${m.name}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'batchNumber']}
                    label={index === 0 ? 'Batch no.' : undefined}
                    rules={[{ required: true, whitespace: true, message: 'Batch number is required.' }]}
                  >
                    <Input maxLength={50} aria-label={`Line ${index + 1} batch`} style={{ width: 130 }} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'expiryDate']}
                    label={index === 0 ? 'Expiry date' : undefined}
                    rules={[
                      { required: true, message: 'Expiry date is required.' },
                      {
                        validator: (_, v: string | null) =>
                          !v || v > receiptDate
                            ? Promise.resolve()
                            : Promise.reject(new Error('Expiry must be after the receipt date.')),
                      },
                    ]}
                    extra={
                      lines[index]?.expiryDate && lines[index].expiryDate > receiptDate
                        ? expiryInfo(lines[index].expiryDate, receiptDate, 0).text
                        : undefined
                    }
                  >
                    <DateField
                      min={receiptDate}
                      aria-label={`Line ${index + 1} expiry`}
                      style={{ width: 160 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'quantity']}
                    label={index === 0 ? 'Quantity' : undefined}
                    rules={[
                      { required: true, message: 'Quantity is required.' },
                      wholeNumber('Quantity', { min: 1, max: 1_000_000 }),
                    ]}
                  >
                    <InputNumber<number>
                      aria-label={`Line ${index + 1} quantity`}
                      suffix={medicineOf(lines[index]?.medicineId)?.baseUnit.name}
                      style={{ width: 140 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'unitCost']}
                    label={index === 0 ? 'Unit cost (VND)' : undefined}
                    // Read like every other amount on screen: a dot that groups three
                    // digits is a thousands separator (15.000 is fifteen thousand); a dot
                    // or comma before one or two digits is a decimal point (1250,50).
                    extra={
                      lineCents(lines[index]) !== null
                        ? `= ${formatVnd(((lineCents(lines[index]) ?? 0) / 100).toFixed(2))}`
                        : index === 0
                          ? '15.000 = fifteen thousand'
                          : undefined
                    }
                    rules={[
                      { required: true, message: 'Unit cost is required.' },
                      decimal('Unit cost', { min: 0, max: 100_000_000, decimals: 2 }),
                    ]}
                  >
                    <InputNumber<number>
                      aria-label={`Line ${index + 1} unit cost`}
                      parser={parseGroupedNumber}
                      placeholder="e.g. 15.000"
                      style={{ width: 150 }}
                    />
                  </Form.Item>
                  <Form.Item label={index === 0 ? ' ' : undefined}>
                    <Button
                      icon={<DeleteOutlined />}
                      aria-label={`Remove line ${index + 1}`}
                      disabled={fields.length === 1 || saving}
                      onClick={() => remove(field.name)}
                    />
                  </Form.Item>
                </Space>
              ))}
              <div>
                <Button
                  icon={<PlusOutlined />}
                  disabled={fields.length >= MAX_LINES || saving}
                  onClick={() => add(EMPTY_LINE)}
                >
                  Add line
                </Button>
              </div>
              {/* Errors about the list itself, e.g. the total is too large. */}
              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Typography.Text strong>
            Total cost: {formatVnd((totalCents / 100).toFixed(2))}
          </Typography.Text>
        </div>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}

function ReceiptDetailsModal({
  id,
  onClose,
  onReversed,
}: {
  id: string;
  onClose: () => void;
  onReversed: () => void;
}) {
  const { message } = App.useApp();
  const [reversing, setReversing] = useState(false);
  const fetchReceipt = useCallback(
    () =>
      goodsReceiptsApi.get(id).catch((error: unknown) => {
        message.error(toApiError(error).message);
        return null;
      }),
    [id, message],
  );
  const { data: receipt, loading, reload } = useLoad<GoodsReceipt | null>(fetchReceipt, null);

  return (
    <Modal
      open
      title={receipt ? `Goods receipt ${receipt.documentNumber}` : 'Goods receipt'}
      footer={null}
      onCancel={onClose}
      width={900}
    >
      {receipt && (
        <>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Supplier">{receipt.supplier.name}</Descriptions.Item>
            <Descriptions.Item label="Receipt date">{receipt.receiptDate}</Descriptions.Item>
            <Descriptions.Item label="Recorded by">{receipt.receivedBy.fullName}</Descriptions.Item>
            <Descriptions.Item label="Total cost">{formatVnd(receipt.totalCost)}</Descriptions.Item>
            {receipt.note && <Descriptions.Item label="Note">{receipt.note}</Descriptions.Item>}
          </Descriptions>
          {receipt.reversed && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={`Reversed by ${receipt.reversed.by} at ${formatDateTime(receipt.reversed.at)}: ${receipt.reversed.reason}`}
              description="Every line was taken back out of stock by an opposite movement; the batch history shows both."
            />
          )}
          <Table
            rowKey="lineNumber"
            size="small"
            pagination={false}
            loading={loading}
            dataSource={receipt.lines}
            locale={{ emptyText: 'This receipt has no line.' }}
            columns={[
              { title: '#', dataIndex: 'lineNumber', width: 40 },
              { title: 'Medicine', render: (_, l) => `${l.medicine.code} — ${l.medicine.name}` },
              { title: 'Batch', className: 'nowrap', render: (_, l) => l.batch.batchNumber },
              { title: 'Expiry', className: 'nowrap', render: (_, l) => l.batch.expiryDate },
              { title: 'Quantity', dataIndex: 'quantity', align: 'right' },
              {
                title: 'Unit cost',
                dataIndex: 'unitCost',
                align: 'right',
                className: 'nowrap',
                render: (v: string) => formatVnd(v),
              },
              {
                title: 'Batch sellable now',
                align: 'right',
                render: (_, l) => l.batch.qtySellable,
              },
            ]}
          />
          {!receipt.reversed && (
            <div style={{ marginTop: 16 }}>
              <Button onClick={() => setReversing(true)}>Reverse goods receipt</Button>
              <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                For a receipt entered by mistake, while none of its stock has been sold or dispensed.
              </Typography.Text>
            </div>
          )}
          {reversing && (
            <ReverseReceiptModal
              receipt={receipt}
              onClose={() => setReversing(false)}
              onDone={() => {
                setReversing(false);
                message.success(`Goods receipt ${receipt.documentNumber} reversed.`);
                reload();
                onReversed();
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
}

/** Undo a whole receipt; the server refuses when any of its stock has already left. */
function ReverseReceiptModal({
  receipt,
  onClose,
  onDone,
}: {
  receipt: GoodsReceipt;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function submit({ reason }: { reason: string }) {
    setSaving(true);
    setRefusal(null);
    try {
      await goodsReceiptsApi.reverse(receipt.id, reason);
      onDone();
    } catch (error) {
      setRefusal(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={`Reverse goods receipt ${receipt.documentNumber}?`}
      okText="Reverse goods receipt"
      okButtonProps={{ danger: true }}
      cancelText="Keep it"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        Every line is taken back out of stock ({receipt.lines.length}{' '}
        {receipt.lines.length === 1 ? 'line' : 'lines'}, {formatVnd(receipt.totalCost)} at cost). The
        receipt stays in the list, marked as reversed. This cannot be undone; enter the right receipt
        again afterwards.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving}>
        <Form.Item
          name="reason"
          label="Reason"
          rules={[{ required: true, whitespace: true, message: 'Say why the receipt is reversed.' }]}
        >
          <Input maxLength={500} autoFocus />
        </Form.Item>
      </Form>
      {refusal && <Alert type="error" showIcon title={refusal} />}
    </Modal>
  );
}
