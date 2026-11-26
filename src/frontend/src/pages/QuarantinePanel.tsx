import { Alert, App, Button, Checkbox, Form, Input, Modal, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { type AssessInput, batchesApi, type QuarantineLine, type ReleaseBlock } from '../api/batches';
import { showApiError } from '../api/errors';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { useBusinessToday } from '../api/clock';
import { formatDateTime } from '../ui/format';
import { BatchStatusTag } from '../ui/tags';

const NO_LINES: QuarantineLine[] = [];

const BLOCKED: Record<ReleaseBlock, string> = {
  controlled: 'A returned controlled medicine never goes back on the shelf.',
  expired: 'The batch has expired.',
  batch_not_active: 'The batch is on hold, recalled or rejected.',
};

/**
 * UC11 assessment of returned goods in quarantine (FR-46, BR11, DEC-04).
 * *Release* puts them back on sale and is offered only when the ledger would
 * accept it; *Reject* sends them to pending destruction.
 */
export function QuarantinePanel() {
  const fetchLines = useCallback(() => batchesApi.quarantine(), []);
  const { data: lines, loading, error: loadError, reload } = useLoad(fetchLines, NO_LINES);
  const today = useBusinessToday();
  const [assessing, setAssessing] = useState<{ line: QuarantineLine; outcome: AssessInput['outcome'] } | null>(null);

  const columns: ColumnsType<QuarantineLine> = [
    { title: 'Returned', width: 140, className: 'nowrap', render: (_, l) => formatDateTime(l.saleReturn.returnedAt) },
    { title: 'Slip', width: 150, className: 'nowrap', render: (_, l) => l.saleReturn.referenceNumber },
    { title: 'Medicine', width: 220, render: (_, l) => `${l.medicine.code} — ${l.medicine.name}` },
    { title: 'Batch', width: 110, className: 'nowrap', render: (_, l) => l.batch.batchNumber },
    { title: 'Expiry', width: 110, className: 'nowrap', render: (_, l) => l.batch.expiryDate },
    {
      title: 'Batch status',
      width: 120,
      render: (_, l) => (
        <BatchStatusTag status={l.batch.status} expiryDate={l.batch.expiryDate} businessDate={today} />
      ),
    },
    { title: 'Quantity', width: 90, align: 'right', render: (_, l) => l.quantity },
    { title: 'Reason for the return', width: 220, render: (_, l) => l.saleReturn.reason },
    {
      title: '',
      width: 200,
      fixed: 'right',
      // Why Release is unavailable is written under it, not hidden in a tooltip.
      render: (_, l) => (
        <>
          <Space>
            <Button
              size="small"
              disabled={l.releaseBlockedBy !== null}
              aria-describedby={l.releaseBlockedBy ? `blocked-${l.returnLineId}` : undefined}
              onClick={() => setAssessing({ line: l, outcome: 'release' })}
            >
              Release
            </Button>
            <Button size="small" onClick={() => setAssessing({ line: l, outcome: 'reject' })}>
              Reject
            </Button>
          </Space>
          {l.releaseBlockedBy && (
            <div id={`blocked-${l.returnLineId}`}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {BLOCKED[l.releaseBlockedBy]}
              </Typography.Text>
            </div>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        Returned goods wait here until a manager assesses them. A release goes back on sale; a
        reject goes to pending destruction.
      </Typography.Paragraph>
      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
      <Table
        rowKey={(l) => l.returnLineId}
        columns={columns}
        scroll={{ x: 'max-content' }}
        dataSource={lines}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Nothing is waiting for assessment.' }}
      />
      {assessing && (
        <AssessModal
          line={assessing.line}
          outcome={assessing.outcome}
          onClose={() => setAssessing(null)}
          onDone={() => {
            setAssessing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

interface AssessForm {
  packagingIntact: boolean;
  storageCredible: boolean;
  note: string;
}

function AssessModal({
  line,
  outcome,
  onClose,
  onDone,
}: {
  line: QuarantineLine;
  outcome: AssessInput['outcome'];
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<AssessForm>();
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const release = outcome === 'release';

  async function submit(values: AssessForm) {
    setSaving(true);
    setRefusal(null);
    try {
      await batchesApi.assess(line.returnLineId, {
        outcome,
        packagingIntact: values.packagingIntact ?? false,
        storageCredible: values.storageCredible ?? false,
        note: values.note,
      });
      message.success(
        release
          ? `${line.quantity} of batch ${line.batch.batchNumber} released to sellable stock.`
          : `${line.quantity} of batch ${line.batch.batchNumber} moved to pending destruction.`,
      );
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
      title={release ? 'Release to sellable stock?' : 'Reject to pending destruction?'}
      okText={release ? `Release ${line.quantity}` : `Reject ${line.quantity}`}
      okButtonProps={{ danger: !release }}
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {line.medicine.name} · batch {line.batch.batchNumber} · expires {line.batch.expiryDate} ·{' '}
        {line.quantity} from {line.saleReturn.referenceNumber}
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={saving}
        initialValues={{ packagingIntact: false, storageCredible: false, note: '' }}
      >
        {release && (
          <>
            <Form.Item
              name="packagingIntact"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, v) =>
                    v ? Promise.resolve() : Promise.reject(new Error('Release only goods whose packaging is intact.')),
                },
              ]}
            >
              <Checkbox>The packaging is intact and sealed</Checkbox>
            </Form.Item>
            <Form.Item
              name="storageCredible"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, v) =>
                    v
                      ? Promise.resolve()
                      : Promise.reject(new Error('Release only goods that were plausibly stored correctly.')),
                },
              ]}
            >
              <Checkbox>It was plausibly stored correctly</Checkbox>
            </Form.Item>
          </>
        )}
        <Form.Item
          name="note"
          label="What you checked"
          rules={[
            { required: true, whitespace: true, message: 'Write what you checked.' },
            { min: 3, message: 'Write what you checked (3–500 characters).' },
          ]}
        >
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
      {!release && (
        <Typography.Paragraph type="secondary">
          It is recorded as destroyed only when the destruction is recorded.
        </Typography.Paragraph>
      )}
      {refusal && <Alert type="error" showIcon title={refusal} />}
    </Modal>
  );
}
