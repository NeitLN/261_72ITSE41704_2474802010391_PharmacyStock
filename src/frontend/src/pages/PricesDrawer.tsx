import {
  Alert,
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { showApiError, toApiError } from '../api/errors';
import { type PriceHistory, type PriceState, pricesApi } from '../api/medicines';
import { useLoad } from '../api/useLoad';
import { wholeNumber } from '../forms/numberRules';
import { formatVnd } from '../ui/format';

type Price = PriceHistory['prices'][number];

const STATE_TAGS: Record<PriceState, { label: string; color?: string }> = {
  scheduled: { label: 'Scheduled', color: 'blue' },
  in_force: { label: 'In force', color: 'green' },
  past: { label: 'Past' },
};

/** `2026-11-02 09:12` in the pharmacy's time zone (ui-design.md §5). */
function setAt(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

/**
 * UC13: a medicine's price history, with scheduling a price from today or
 * later and cancelling one that has not started (FR-04, BR09). Today's price
 * itself is still changed through Edit (UC01).
 */
export function PricesDrawer({
  medicineId,
  onClose,
  onChanged,
}: {
  medicineId: string | null;
  onClose: () => void;
  /** The list shows the price in force today; reload it after a change. */
  onChanged: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ unitPrice: number; effectiveFrom: string }>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fetchHistory = useCallback(
    () => (medicineId ? pricesApi.history(medicineId) : Promise.resolve(null)),
    [medicineId],
  );
  const { data: history, loading, reload } = useLoad<PriceHistory | null>(fetchHistory, null);

  async function schedule(values: { unitPrice: number; effectiveFrom: string }) {
    if (!medicineId) return;
    setSaving(true);
    setFormError(null);
    try {
      await pricesApi.schedule(medicineId, values);
      message.success(`${formatVnd(String(values.unitPrice))} scheduled from ${values.effectiveFrom}.`);
      form.resetFields();
      reload();
      onChanged();
    } catch (error) {
      setFormError(showApiError(form, error));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(price: Price) {
    if (!medicineId) return;
    try {
      await pricesApi.cancel(medicineId, price.id);
      message.success(`The price from ${price.effectiveFrom} was cancelled.`);
      reload();
      onChanged();
    } catch (error) {
      message.error(toApiError(error).message);
      reload();
    }
  }

  const inForce = history?.prices.find((p) => p.state === 'in_force');
  const columns: ColumnsType<Price> = [
    { title: 'From', dataIndex: 'effectiveFrom' },
    { title: 'Price', align: 'right', render: (_, p) => formatVnd(p.unitPrice) },
    {
      title: 'State',
      render: (_, p) => <Tag color={STATE_TAGS[p.state].color}>{STATE_TAGS[p.state].label}</Tag>,
    },
    {
      title: 'Set by',
      render: (_, p) => (
        <>
          {p.setBy.fullName}
          <br />
          <Typography.Text type="secondary">{setAt(p.createdAt)}</Typography.Text>
        </>
      ),
    },
    {
      title: '',
      render: (_, p) =>
        p.state === 'scheduled' && (
          <Popconfirm
            title={`Cancel the price from ${p.effectiveFrom}?`}
            description={`${formatVnd(p.unitPrice)} will not come into force.${
              inForce ? ` Sales keep using ${formatVnd(inForce.unitPrice)}.` : ''
            }`}
            okText="Cancel price"
            okButtonProps={{ danger: true }}
            cancelText="Keep it"
            onConfirm={() => cancel(p)}
          >
            <Button size="small">Cancel</Button>
          </Popconfirm>
        ),
    },
  ];
  const scheduled = history?.prices.some((p) => p.state === 'scheduled') ?? false;

  return (
    <Drawer
      open={medicineId !== null}
      onClose={onClose}
      size="large"
      title={history ? `Prices — ${history.medicine.code} ${history.medicine.name}` : 'Prices'}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={schedule} disabled={saving || !history}>
        <Space align="start" wrap>
          <Form.Item
            name="unitPrice"
            label="Price (VND)"
            rules={[{ required: true, message: 'Price is required.' }, wholeNumber('Price', { min: 1 })]}
          >
            <InputNumber<number> style={{ width: 160 }} />
          </Form.Item>
          <Form.Item
            name="effectiveFrom"
            label="From"
            rules={[{ required: true, message: 'Choose the date the price starts.' }]}
            extra={history ? `Today (${history.today}) at the earliest.` : undefined}
          >
            <Input type="date" min={history?.today} style={{ width: 170 }} />
          </Form.Item>
          <Form.Item label=" ">
            <Button type="primary" htmlType="submit" loading={saving}>
              Schedule price
            </Button>
          </Form.Item>
        </Space>
        {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} />}
      </Form>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={history?.prices ?? []}
        pagination={false}
        locale={{ emptyText: 'No price yet.' }}
        footer={() =>
          history && !scheduled ? (
            <Typography.Text type="secondary">No price change scheduled.</Typography.Text>
          ) : null
        }
      />
    </Drawer>
  );
}
