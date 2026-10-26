import { Alert, App, Button, Form, Input, Modal, Radio, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { type BatchStatus, batchesApi, type ExpiryRow } from '../api/batches';
import { showApiError } from '../api/errors';
import { medicinesApi, type Reference } from '../api/medicines';
import { useLoad } from '../api/useLoad';
import { useAuth } from '../auth/authContext';
import { formatVnd } from '../ui/format';
import { StatusTag } from '../ui/tags';

const NO_REFERENCE = { categories: [] as Reference[], units: [] as Reference[] };

const STATUS_OPTIONS: Array<{ value: BatchStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'recalled', label: 'Recalled' },
  { value: 'rejected', label: 'Rejected' },
];

function daysText(row: ExpiryRow) {
  if (row.daysLeft < 0) return <strong>Expired {-row.daysLeft} days ago</strong>;
  if (row.daysLeft === 0) return <strong>Expired today</strong>;
  return `${row.daysLeft} days left`;
}

/**
 * UC11 the expiry list (FR-35), write-off (FR-36) and batch status (FR-48).
 * Expired first, then expiring soon; *Write off* only where the ledger
 * accepts it (expired or not active), *Change status* on every row.
 */
export function ExpiryPanel() {
  const { can } = useAuth();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [writingOff, setWritingOff] = useState<ExpiryRow | null>(null);
  const [changing, setChanging] = useState<ExpiryRow | null>(null);
  const fetchReport = useCallback(() => batchesApi.expiry(categoryId), [categoryId]);
  const { data: report, loading, reload } = useLoad(fetchReport, null);
  const fetchReference = useCallback(() => medicinesApi.referenceData(), []);
  const { data: reference } = useLoad(fetchReference, NO_REFERENCE);
  const canChange = can('batch_status.manage');

  const columns: ColumnsType<ExpiryRow> = [
    { title: 'Medicine', render: (_, r) => `${r.medicine.code} — ${r.medicine.name}` },
    { title: 'Batch', width: 110, render: (_, r) => r.batch.batchNumber },
    { title: 'Expiry', width: 110, render: (_, r) => r.batch.expiryDate },
    { title: 'Days left', width: 170, align: 'right', render: (_, r) => daysText(r) },
    { title: 'Sellable', width: 90, align: 'right', render: (_, r) => r.sellable },
    { title: 'Value at cost', width: 130, align: 'right', render: (_, r) => formatVnd(r.value) },
    {
      title: 'Status',
      width: 110,
      render: (_, r) => <StatusTag kind="batch" value={r.batch.status} />,
    },
  ];
  if (canChange) {
    columns.push({
      title: '',
      width: 220,
      render: (_, r) => (
        <Space>
          {r.canWriteOff && (
            <Button size="small" danger onClick={() => setWritingOff(r)}>
              Write off
            </Button>
          )}
          <Button size="small" onClick={() => setChanging(r)}>
            Change status
          </Button>
        </Space>
      ),
    });
  }

  return (
    <>
      <Space wrap>
        <Select
          allowClear
          placeholder="All categories"
          style={{ width: 220 }}
          value={categoryId}
          onChange={setCategoryId}
          options={reference.categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        {report && (
          <Typography.Text type="secondary">
            Business date {report.totals.businessDate} · each medicine’s own alert window ·{' '}
            {report.totals.expired.batches} expired ({formatVnd(report.totals.expired.value)}),{' '}
            {report.totals.expiringSoon.batches} expiring soon
          </Typography.Text>
        )}
      </Space>
      <Table
        rowKey={(r) => r.batch.id}
        columns={columns}
        dataSource={report?.rows ?? []}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No batch with stock expires within its alert window.' }}
        style={{ marginTop: 16 }}
      />
      <Typography.Paragraph type="secondary">
        Write off is offered for a batch that is expired or not active. Expired, held and recalled
        batches are never issued.
      </Typography.Paragraph>
      {writingOff && (
        <WriteOffModal
          row={writingOff}
          onClose={() => setWritingOff(null)}
          onDone={() => {
            setWritingOff(null);
            reload();
          }}
        />
      )}
      {changing && (
        <StatusModal
          row={changing}
          onClose={() => setChanging(null)}
          onDone={() => {
            setChanging(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function WriteOffModal({
  row,
  onClose,
  onDone,
}: {
  row: ExpiryRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ reason: string }>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function submit({ reason }: { reason: string }) {
    setSaving(true);
    setRefusal(null);
    try {
      await batchesApi.writeOff(row.batch.id, reason);
      message.success(`Batch ${row.batch.batchNumber} written off: ${row.sellable} to pending destruction.`);
      onDone();
    } catch (error) {
      const field = showApiError(form, error);
      if (field) setRefusal(field);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={`Write off batch ${row.batch.batchNumber}?`}
      okText={`Write off ${row.sellable}`}
      okButtonProps={{ danger: true }}
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {row.medicine.name} · expires {row.batch.expiryDate} ·{' '}
        <StatusTag kind="batch" value={row.batch.status} />
      </Typography.Paragraph>
      <Table
        size="small"
        pagination={false}
        rowKey={() => row.batch.id}
        dataSource={[row]}
        columns={[
          { title: 'Sellable now', align: 'right', render: () => row.sellable },
          { title: 'To pending destruction', align: 'right', render: () => row.sellable },
          { title: 'Value at cost', align: 'right', render: () => formatVnd(row.value) },
        ]}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        The whole quantity moves to pending destruction. It is recorded as destroyed only when the
        destruction is recorded.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving}>
        <Form.Item
          name="reason"
          label="Reason"
          rules={[{ required: true, whitespace: true, message: 'Say why the batch is written off.' }]}
        >
          <Input maxLength={500} />
        </Form.Item>
      </Form>
      {refusal && <Alert type="error" showIcon message={refusal} />}
    </Modal>
  );
}

function StatusModal({
  row,
  onClose,
  onDone,
}: {
  row: ExpiryRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ status: BatchStatus; reason: string }>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const status = Form.useWatch('status', form);

  async function submit(values: { status: BatchStatus; reason: string }) {
    setSaving(true);
    setRefusal(null);
    try {
      await batchesApi.setStatus(row.batch.id, values.status, values.reason);
      message.success(`Batch ${row.batch.batchNumber} is now ${values.status.replace('_', ' ')}.`);
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
      title={`Change the status of batch ${row.batch.batchNumber}`}
      okText="Change status"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {row.medicine.name} · expires {row.batch.expiryDate} · now{' '}
        <StatusTag kind="batch" value={row.batch.status} />
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving}>
        <Form.Item name="status" rules={[{ required: true, message: 'Choose a status.' }]}>
          <Radio.Group options={STATUS_OPTIONS} />
        </Form.Item>
        {status === 'rejected' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Rejected is final. The batch can never be sold or dispensed again."
          />
        )}
        <Form.Item
          name="reason"
          label="Reason"
          rules={[{ required: true, whitespace: true, message: 'Say why the status changes.' }]}
        >
          <Input maxLength={500} />
        </Form.Item>
      </Form>
      <Typography.Paragraph type="secondary">
        A batch that is not active is left out of dispensing, sales and the sellable total from now;
        low-stock alerts are checked again.
      </Typography.Paragraph>
      {refusal && <Alert type="error" showIcon message={refusal} />}
    </Modal>
  );
}
