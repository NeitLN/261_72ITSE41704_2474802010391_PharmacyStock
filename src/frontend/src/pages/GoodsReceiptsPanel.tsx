import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
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
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { decimal, wholeNumber } from '../forms/numberRules';
import {
  type GoodsReceipt,
  type GoodsReceiptInput,
  type GoodsReceiptSummary,
  goodsReceiptsApi,
} from '../api/goodsReceipts';
import { type Medicine, medicinesApi } from '../api/medicines';
import { formatVnd } from '../ui/format';
import { type Supplier, suppliersApi } from '../api/suppliers';
import { useLoad } from '../api/useLoad';

const NO_RECEIPTS: GoodsReceiptSummary[] = [];
const NO_MEDICINES: Medicine[] = [];
const NO_SUPPLIERS: Supplier[] = [];

/**
 * Today's business date, `YYYY-MM-DD` in Asia/Ho_Chi_Minh (decision 10), the
 * same calendar the API uses, whatever the browser's time zone.
 */
function businessToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/** The API accepts at most this many lines per receipt. */
const MAX_LINES = 100;

/** UC03 Record a goods receipt: the list, the entry form and the details. */
export function GoodsReceiptsPanel() {
  const { message } = App.useApp();
  const [recording, setRecording] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: receipts, loading, reload } = useLoad(goodsReceiptsApi.list, NO_RECEIPTS);

  const columns: ColumnsType<GoodsReceiptSummary> = [
    { title: 'Receipt date', dataIndex: 'receiptDate', width: 130 },
    { title: 'Document', dataIndex: 'documentNumber', width: 160 },
    { title: 'Supplier', render: (_, r) => r.supplier.name },
    { title: 'Lines', dataIndex: 'lineCount', width: 80, align: 'right' },
    {
      title: 'Total cost',
      dataIndex: 'totalCost',
      width: 160,
      align: 'right',
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
          Each receipt line creates or tops up a batch and adds its quantity to sellable
          stock. Receipts are never edited.
        </Typography.Paragraph>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecording(true)}>
          Record receipt
        </Button>
      </Space>
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
              `Receipt ${saved.documentNumber} recorded: ${saved.lines.length} line(s).`,
            );
            setRecording(false);
            reload();
            setOpenId(saved.id);
          }}
        />
      )}
      {openId && <ReceiptDetailsModal id={openId} onClose={() => setOpenId(null)} />}
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
  const [form] = Form.useForm<GoodsReceiptInput>();
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
      okText="Save receipt"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={1080}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ receiptDate: businessToday(), lines: [EMPTY_LINE] }}
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
              optionFilterProp="label"
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
            <Input type="date" style={{ width: 170 }} />
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
                      optionFilterProp="label"
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
                    rules={[{ required: true, message: 'Expiry date is required.' }]}
                  >
                    <Input type="date" aria-label={`Line ${index + 1} expiry`} style={{ width: 160 }} />
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
                      style={{ width: 110 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'unitCost']}
                    label={index === 0 ? 'Unit cost (VND)' : undefined}
                    rules={[
                      { required: true, message: 'Unit cost is required.' },
                      decimal('Unit cost', { min: 0, max: 100_000_000, decimals: 2 }),
                    ]}
                  >
                    <InputNumber<number>
                      aria-label={`Line ${index + 1} unit cost`}
                      style={{ width: 140 }}
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

function ReceiptDetailsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { message } = App.useApp();
  const fetchReceipt = useCallback(
    () =>
      goodsReceiptsApi.get(id).catch((error: unknown) => {
        message.error(toApiError(error).message);
        return null;
      }),
    [id, message],
  );
  const { data: receipt, loading } = useLoad<GoodsReceipt | null>(fetchReceipt, null);

  return (
    <Modal
      open
      title={receipt ? `Receipt ${receipt.documentNumber}` : 'Receipt'}
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
          <Table
            rowKey="lineNumber"
            size="small"
            pagination={false}
            loading={loading}
            dataSource={receipt.lines}
            columns={[
              { title: '#', dataIndex: 'lineNumber', width: 40 },
              { title: 'Medicine', render: (_, l) => `${l.medicine.code} — ${l.medicine.name}` },
              { title: 'Batch', render: (_, l) => l.batch.batchNumber },
              { title: 'Expiry', render: (_, l) => l.batch.expiryDate },
              { title: 'Quantity', dataIndex: 'quantity', align: 'right' },
              {
                title: 'Unit cost',
                dataIndex: 'unitCost',
                align: 'right',
                render: (v: string) => formatVnd(v),
              },
              {
                title: 'Batch now sellable',
                align: 'right',
                render: (_, l) => l.batch.qtySellable,
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
}
