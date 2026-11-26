import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Modal, Radio, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { type BatchView, batchesApi, type DestructionMethod } from '../api/batches';
import { useBusinessToday } from '../api/clock';
import { showApiError } from '../api/errors';
import { wholeNumber } from '../forms/numberRules';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { BatchStatusTag } from '../ui/tags';

const NO_BATCHES: BatchView[] = [];

const METHODS: Array<{ value: DestructionMethod; label: string }> = [
  { value: 'supplier_return', label: 'Returned to the supplier' },
  { value: 'licensed_contractor', label: 'Licensed waste contractor' },
  { value: 'other', label: 'Other' },
];

/**
 * UC11 stock pending destruction and the record of its destruction (FR-47,
 * DEC-04). Written-off and rejected stock waits here; it is *destroyed* only
 * once a destruction is recorded with its date, method and witness.
 */
export function DestructionPanel() {
  const fetchBatches = useCallback(() => batchesApi.pendingDestruction(), []);
  const { data: batches, loading, error: loadError, reload } = useLoad(fetchBatches, NO_BATCHES);
  const [destroying, setDestroying] = useState<BatchView | null>(null);
  const today = useBusinessToday();

  const columns: ColumnsType<BatchView> = [
    { title: 'Medicine', width: 240, render: (_, b) => `${b.medicine.code} — ${b.medicine.name}` },
    { title: 'Batch', width: 110, className: 'nowrap', render: (_, b) => b.batchNumber },
    { title: 'Expiry', width: 110, className: 'nowrap', render: (_, b) => b.expiryDate },
    {
      title: 'Batch status',
      width: 120,
      render: (_, b) => <BatchStatusTag status={b.status} expiryDate={b.expiryDate} businessDate={today} />,
    },
    { title: 'Pending destruction', width: 160, align: 'right', render: (_, b) => b.qtyPendingDestruction },
    {
      title: '',
      width: 170,
      fixed: 'right',
      render: (_, b) => (
        <Button size="small" onClick={() => setDestroying(b)}>
          Record destruction
        </Button>
      ),
    },
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        Written-off and rejected stock stays here until its destruction is recorded.
      </Typography.Paragraph>
      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
      <Table
        rowKey={(b) => b.id}
        columns={columns}
        scroll={{ x: 'max-content' }}
        dataSource={batches}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No stock is pending destruction.' }}
      />
      {destroying && (
        <DestroyModal
          batch={destroying}
          onClose={() => setDestroying(null)}
          onDone={() => {
            setDestroying(null);
            reload();
          }}
        />
      )}
    </>
  );
}

interface DestroyForm {
  quantity: number;
  destroyedOn: Dayjs;
  method: DestructionMethod;
  methodNote?: string;
  witness: string;
  note?: string;
}

function DestroyModal({
  batch,
  onClose,
  onDone,
}: {
  batch: BatchView;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<DestroyForm>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const method = Form.useWatch('method', form);
  // The server's business date (#255), not the PC's clock.
  const today = useBusinessToday();
  useEffect(() => {
    // The server's date can arrive after the form opened; follow it until the user picks a date.
    if (!form.isFieldTouched('destroyedOn')) form.setFieldValue('destroyedOn', dayjs(today, 'YYYY-MM-DD'));
  }, [form, today]);

  async function submit(values: DestroyForm) {
    setSaving(true);
    setRefusal(null);
    try {
      await batchesApi.recordDestruction(batch.id, {
        quantity: values.quantity,
        destroyedOn: values.destroyedOn.format('YYYY-MM-DD'),
        method: values.method,
        methodNote: values.methodNote,
        witness: values.witness,
        note: values.note,
      });
      message.success(`${values.quantity} of batch ${batch.batchNumber} recorded as destroyed.`);
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
      title={`Record destruction of batch ${batch.batchNumber}`}
      okText="Record destruction"
      okButtonProps={{ danger: true }}
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {batch.medicine.name} · {batch.qtyPendingDestruction} pending destruction
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={saving}
        initialValues={{
          quantity: batch.qtyPendingDestruction,
          destroyedOn: dayjs(today, 'YYYY-MM-DD'),
          method: 'licensed_contractor',
        }}
      >
        <Form.Item
          name="quantity"
          label="Quantity destroyed"
          rules={[
            { required: true, message: 'Enter a whole number of units.' },
            wholeNumber('Quantity', { min: 1, max: batch.qtyPendingDestruction }),
          ]}
        >
          {/* No min, max or precision: they quietly change what was typed (#125). */}
          <InputNumber<number> style={{ width: 160 }} />
        </Form.Item>
        <Form.Item
          name="destroyedOn"
          label="Date destroyed"
          rules={[{ required: true, message: 'Choose the day it was destroyed.' }]}
        >
          <DatePicker
            format="YYYY-MM-DD"
            disabledDate={(d) => d.format('YYYY-MM-DD') > today}
          />
        </Form.Item>
        <Form.Item name="method" label="Method" rules={[{ required: true }]}>
          <Radio.Group options={METHODS} />
        </Form.Item>
        {method === 'other' && (
          <Form.Item
            name="methodNote"
            label="How"
            rules={[{ required: true, whitespace: true, message: 'Say how it was destroyed.' }]}
          >
            <Input maxLength={200} />
          </Form.Item>
        )}
        <Form.Item
          name="witness"
          label="Witness"
          rules={[
            { required: true, whitespace: true, message: 'Name the witness.' },
            { min: 2, message: 'Name the witness (2 to 100 characters).' },
          ]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="note" label="Note (certificate number, for example)">
          <Input maxLength={500} />
        </Form.Item>
      </Form>
      {refusal && <Alert type="error" showIcon title={refusal} />}
    </Modal>
  );
}
