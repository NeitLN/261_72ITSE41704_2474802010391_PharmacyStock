import { PlusOutlined } from '@ant-design/icons';
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
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { type FieldError, toApiError } from '../api/errors';
import { type Medicine, medicinesApi } from '../api/medicines';
import { stockApi, type StockBatch } from '../api/stock';
import { formatDateTime, formatVnd } from '../ui/format';
import {
  STOCK_TAKE_STATUS_LABELS,
  type StockTake,
  type StockTakeLine,
  type StockTakeStatus,
  type StockTakeSummary,
  stockTakesApi,
} from '../api/stockTakes';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { useAuth } from '../auth/authContext';
import { wholeNumber } from '../forms/numberRules';
import { StatusTag as SharedStatusTag } from '../ui/tags';
import { matchesLabel } from '../ui/search';

const NO_TAKES: StockTakeSummary[] = [];
const NO_MEDICINES: Medicine[] = [];

function StatusTag({ status }: { status: StockTakeStatus }) {
  return <SharedStatusTag kind="stockTake" value={status} />;
}

/** UC09 Conduct a stock take: the list, opening one, the count sheet and approval. */
export function StockTakesPanel() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const [status, setStatus] = useState<StockTakeStatus | undefined>();
  const [opening, setOpening] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const fetchTakes = useCallback(() => stockTakesApi.list(status), [status]);
  const { data: takes, loading, error: loadError, reload } = useLoad(fetchTakes, NO_TAKES);
  const canApprove = can('stock_take.approve');

  const columns: ColumnsType<StockTakeSummary> = [
    { title: 'Reference', dataIndex: 'referenceNumber', width: 170, className: 'nowrap' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 170,
      render: (s: StockTakeStatus) => <StatusTag status={s} />,
    },
    {
      title: 'Lines counted',
      width: 120,
      align: 'right',
      render: (_, r) => `${r.countedCount} of ${r.lineCount}`,
    },
    { title: 'Started by', render: (_, r) => r.openedBy.fullName },
    { title: 'Submitted by', render: (_, r) => r.countedBy?.fullName ?? '—' },
    { title: 'Approved by', render: (_, r) => r.approvedBy?.fullName ?? '—' },
    { title: 'Started', width: 150, className: 'nowrap', render: (_, r) => formatDateTime(r.createdAt) },
    {
      title: '',
      key: 'open',
      width: 100,
      fixed: 'right',
      // The button names what this user will do there.
      render: (_, r) => (
        <Button
          size="small"
          type={
            (r.status === 'counting' && can('stock_take.count')) ||
            (r.status === 'pending_approval' && can('stock_take.approve'))
              ? 'primary'
              : 'default'
          }
          onClick={() => setOpenId(r.id)}
        >
          {r.status === 'counting' && can('stock_take.count')
            ? 'Count'
            : r.status === 'pending_approval' && can('stock_take.approve')
              ? 'Review'
              : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Select
          allowClear
          placeholder="Any status"
          style={{ width: 220 }}
          value={status}
          onChange={setStatus}
          options={Object.entries(STOCK_TAKE_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        {canApprove && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpening(true)}>
            New stock take
          </Button>
        )}
      </Space>
      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={takes}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No stock takes yet.' }}
        style={{ marginTop: 16 }}
      />
      {opening && (
        <OpenStockTakeModal
          onClose={() => setOpening(false)}
          onOpened={(take) => {
            message.success(`Stock take ${take.referenceNumber} opened with ${take.lines.length} line(s).`);
            setOpening(false);
            reload();
            setOpenId(take.id);
          }}
        />
      )}
      {openId && (
        <StockTakeModal
          id={openId}
          onClose={() => {
            setOpenId(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function OpenStockTakeModal({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (take: StockTake) => void;
}) {
  const [form] = Form.useForm<{ medicineIds: string[]; note?: string }>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fetchMedicines = useCallback(() => medicinesApi.list({}), []);
  const { data: medicines } = useLoad(fetchMedicines, NO_MEDICINES);

  async function submit(values: { medicineIds: string[]; note?: string }) {
    setSaving(true);
    setFormError(null);
    try {
      onOpened(await stockTakesApi.open(values));
    } catch (error) {
      const apiError = toApiError(error);
      setFormError(apiError.errors[0]?.message ?? apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="New stock take"
      okText="Open stock take"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={640}
    >
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving}>
        <Form.Item
          name="medicineIds"
          label="Medicines to count"
          extra="One line is made for every batch of these medicines that has stock on the book."
          rules={[{ required: true, message: 'Choose at least one medicine to count.' }]}
        >
          <Select
            mode="multiple"
            showSearch
            filterOption={matchesLabel}
            options={medicines.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))}
          />
        </Form.Item>
        <Form.Item name="note" label="Note">
          <Input maxLength={500} />
        </Form.Item>
        {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
      </Form>
    </Modal>
  );
}

function StockTakeModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { can } = useAuth();
  const { message, modal } = App.useApp();
  const fetchTake = useCallback(() => stockTakesApi.get(id), [id]);
  const { data: loaded, loading } = useLoad<StockTake | null>(fetchTake, null);
  const [take, setTake] = useState<StockTake | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingLine, setSavingLine] = useState<string | null>(null);
  const [dirty, setDirty] = useState<string[]>([]);
  const [problems, setProblems] = useState<FieldError[]>([]);
  const current = take ?? loaded;
  const canCount = can('stock_take.count');
  const canApprove = can('stock_take.approve');

  async function run(action: () => Promise<StockTake>, done?: string): Promise<boolean> {
    setBusy(true);
    setProblems([]);
    try {
      const updated = await action();
      setTake(updated);
      if (done) message.success(done);
      return true;
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.errors.length > 0) setProblems(apiError.errors);
      else message.error(apiError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function countLine(lineId: string, countedQuantity: number, reason?: string) {
    setSavingLine(lineId);
    const ok = await run(() => stockTakesApi.count(current!.id, lineId, { countedQuantity, reason }));
    setSavingLine(null);
    if (ok) setDirty((d) => d.filter((x) => x !== lineId));
  }

  if (!current) {
    return <Modal open title="Stock take" footer={null} onCancel={onClose} loading={loading} />;
  }

  const counting = current.status === 'counting';
  const pending = current.status === 'pending_approval';
  const actions = [
    counting && canCount && (
      <Button
        key="submit"
        type="primary"
        loading={busy && savingLine === null}
        disabled={dirty.length > 0}
        title={dirty.length > 0 ? 'Save every changed line first.' : undefined}
        onClick={() => run(() => stockTakesApi.submit(current.id), 'Submitted for approval.')}
      >
        {dirty.length > 0 ? `Save ${dirty.length} changed ${dirty.length === 1 ? 'line' : 'lines'} first` : 'Submit for approval'}
      </Button>
    ),
    pending && canApprove && (
      <Button
        key="approve"
        type="primary"
        loading={busy}
        onClick={() =>
          modal.confirm({
            title: 'Approve this stock take?',
            content: 'Every difference is posted to stock now. This cannot be undone.',
            okText: 'Approve',
            onOk: () => run(() => stockTakesApi.approve(current.id), 'Approved; differences posted.'),
          })
        }
      >
        Approve
      </Button>
    ),
    pending && canApprove && (
      <ReturnButton
        key="return"
        disabled={busy}
        onReturn={(comment) =>
          run(() => stockTakesApi.returnToCounting(current.id, comment), 'Returned for recount.')
        }
      />
    ),
    (counting || pending) && canApprove && (
      <Button
        key="cancel"
        danger
        disabled={busy}
        onClick={() =>
          modal.confirm({
            title: 'Cancel this stock take?',
            content: 'Nothing is posted; the record is kept.',
            okText: 'Cancel stock take',
            okButtonProps: { danger: true },
            cancelText: 'Keep it',
            onOk: () => run(() => stockTakesApi.cancel(current.id), 'Stock take cancelled.'),
          })
        }
      >
        Cancel stock take
      </Button>
    ),
    <Button key="close" onClick={onClose}>
      Close
    </Button>,
  ].filter(Boolean);

  return (
    <Modal
      open
      title={
        <Space>
          Stock take {current.referenceNumber}
          <StatusTag status={current.status} />
        </Space>
      }
      onCancel={onClose}
      width={1100}
      footer={actions}
    >
      <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Opened by">
          {current.openedBy.fullName}, {formatDateTime(current.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Counted by">
          {current.countedBy
            ? `${current.countedBy.fullName}, ${formatDateTime(current.submittedAt)}`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Approved by">
          {current.approvedBy
            ? `${current.approvedBy.fullName}, ${formatDateTime(current.approvedAt)}`
            : '—'}
        </Descriptions.Item>
        {current.note && (
          <Descriptions.Item label="Note" span={3}>
            <span style={{ whiteSpace: 'pre-line' }}>{current.note}</span>
          </Descriptions.Item>
        )}
      </Descriptions>
      {counting && (
        <Typography.Paragraph type="secondary">
          Count what is on the shelf for each batch. The book quantity stays hidden until
          the count is submitted, so it does not steer the count. Where your count will
          differ from the book, give a reason.
        </Typography.Paragraph>
      )}
      {problems.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title="This step could not be done:"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {problems.map((p) => (
                <li key={`${p.field}-${p.message}`}>{p.message}</li>
              ))}
            </ul>
          }
        />
      )}
      {counting && canCount && (
        <AddBatch
          take={current}
          busy={busy}
          onAdd={(batchId) =>
            run(() => stockTakesApi.addLine(current.id, batchId), 'Batch added to the count sheet.')
          }
        />
      )}
      <LinesTable
        take={current}
        editable={counting && canCount}
        savingLine={savingLine}
        onCount={countLine}
        onDirty={(lineId) => setDirty((d) => (d.includes(lineId) ? d : [...d, lineId]))}
      />
      {current.status === 'approved' && (
        <Typography.Paragraph style={{ marginTop: 16 }}>
          {current.adjustments.length === 0
            ? 'No differences: nothing was posted.'
            : `Posted: ${current.adjustments
                .map((a) => `batch ${a.batchNumber} ${a.deltaSellable > 0 ? '+' : ''}${a.deltaSellable}`)
                .join(', ')}.`}
        </Typography.Paragraph>
      )}
    </Modal>
  );
}

/**
 * UC09 A3 (#223): add a batch of a chosen medicine that the sheet does not
 * list, e.g. one the book holds at 0 but found on the shelf. Chosen
 * medicines with no line at all are named, so they are not forgotten.
 */
function AddBatch({
  take,
  busy,
  onAdd,
}: {
  take: StockTake;
  busy: boolean;
  onAdd: (batchId: string) => void;
}) {
  const [medicineId, setMedicineId] = useState<string | undefined>();
  const [batchId, setBatchId] = useState<string | undefined>();
  const fetchBatches = useCallback(
    () => (medicineId ? stockApi.medicine(medicineId).then((m) => m.batches) : Promise.resolve([])),
    [medicineId],
  );
  const { data: batches, loading } = useLoad<StockBatch[]>(fetchBatches, []);
  const onSheet = new Set(take.lines.map((l) => l.batch.id));
  const missing = take.medicines.filter((m) => m.lineCount === 0);
  const candidates = batches.filter((b) => !onSheet.has(b.id));

  return (
    <div style={{ marginBottom: 16 }}>
      {missing.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={`No stock on the book for ${missing.map((m) => `${m.code} — ${m.name}`).join(', ')}.`}
          description="If you find any on the shelf, add its batch below and count it."
        />
      )}
      <Space wrap>
        <Typography.Text>Add a batch the sheet does not list:</Typography.Text>
        <Select
          placeholder="Medicine"
          aria-label="Medicine to add a batch of"
          style={{ width: 280 }}
          value={medicineId}
          onChange={(v) => {
            setMedicineId(v);
            setBatchId(undefined);
          }}
          options={take.medicines.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))}
        />
        <Select
          placeholder="Batch"
          aria-label="Batch to add"
          style={{ width: 300 }}
          disabled={!medicineId}
          loading={loading}
          value={batchId}
          onChange={setBatchId}
          notFoundContent={medicineId ? 'Every batch of this medicine is on the sheet.' : null}
          options={candidates.map((b) => ({
            value: b.id,
            // No quantity: the count is blind until it is submitted.
            label: `${b.batchNumber} — expires ${b.expiryDate}`,
          }))}
        />
        <Button
          icon={<PlusOutlined />}
          disabled={!batchId || busy}
          onClick={() => {
            if (!batchId) return;
            onAdd(batchId);
            setBatchId(undefined);
          }}
        >
          Add batch
        </Button>
      </Space>
    </div>
  );
}

function LinesTable({
  take,
  editable,
  savingLine,
  onCount,
  onDirty,
}: {
  take: StockTake;
  editable: boolean;
  savingLine: string | null;
  onCount: (lineId: string, countedQuantity: number, reason?: string) => void;
  onDirty: (lineId: string) => void;
}) {
  const columns: ColumnsType<StockTakeLine> = [
    {
      title: 'Medicine',
      render: (_, l) => `${l.batch.medicine.code} — ${l.batch.medicine.name}`,
    },
    { title: 'Batch', width: 110, className: 'nowrap', render: (_, l) => l.batch.batchNumber },
    { title: 'Expiry', width: 110, className: 'nowrap', render: (_, l) => l.batch.expiryDate },
  ];
  if (editable) {
    columns.push({
      title: 'Count and reason',
      width: 480,
      render: (_, l) => (
        <CountForm line={l} busy={savingLine === l.id} onCount={onCount} onDirty={() => onDirty(l.id)} />
      ),
    });
  } else {
    columns.push(
      { title: 'Book', width: 80, align: 'right', render: (_, l) => l.systemQuantity ?? '—' },
      { title: 'Counted', width: 90, align: 'right', render: (_, l) => l.countedQuantity ?? '—' },
      {
        title: 'Difference',
        width: 100,
        align: 'right',
        render: (_, l) =>
          l.difference === null ? '—' : (
            <Typography.Text type={l.difference === 0 ? undefined : 'danger'}>
              {l.difference > 0 ? `+${l.difference}` : l.difference}
            </Typography.Text>
          ),
      },
      {
        title: 'Value',
        width: 120,
        align: 'right',
        render: (_, l) => formatVnd(l.differenceValue),
      },
      { title: 'Reason', render: (_, l) => l.reason ?? '—' },
    );
  }
  return (
    <Table
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={take.lines}
      pagination={false}
      locale={{ emptyText: 'This stock take has no line.' }}
    />
  );
}

/** One line's count. Saving it also takes the book quantity at that moment (decision 15). */
function CountForm({
  line,
  busy,
  onCount,
  onDirty,
}: {
  line: StockTakeLine;
  busy: boolean;
  onCount: (lineId: string, countedQuantity: number, reason?: string) => void;
  onDirty: () => void;
}) {
  const [form] = Form.useForm<{ countedQuantity: number; reason?: string }>();
  return (
    <Form
      form={form}
      layout="inline"
      disabled={busy}
      onValuesChange={onDirty}
      initialValues={{
        countedQuantity: line.countedQuantity ?? undefined,
        reason: line.reason ?? undefined,
      }}
      onFinish={(v) => onCount(line.id, v.countedQuantity, v.reason)}
    >
      <Form.Item
        name="countedQuantity"
        rules={[
          { required: true, message: 'Enter the count.' },
          wholeNumber('Counted quantity', { min: 0, max: 1_000_000 }),
        ]}
      >
        {/* Enter saves the line, like the Save button. */}
        <InputNumber<number>
          aria-label={`Counted ${line.batch.batchNumber}`}
          style={{ width: 90 }}
          onPressEnter={() => form.submit()}
        />
      </Form.Item>
      <Form.Item name="reason">
        <Input
          aria-label={`Reason ${line.batch.batchNumber}`}
          placeholder="Reason, if different"
          maxLength={500}
          style={{ width: 220 }}
        />
      </Form.Item>
      <Form.Item>
        <Button htmlType="submit" size="small" loading={busy}>
          {line.countedQuantity === null ? 'Save' : `Saved: ${line.countedQuantity}`}
        </Button>
      </Form.Item>
    </Form>
  );
}

function ReturnButton({
  disabled,
  onReturn,
}: {
  disabled: boolean;
  onReturn: (comment: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ comment: string }>();
  return (
    <>
      <Button disabled={disabled} onClick={() => setOpen(true)}>
        Return for recount
      </Button>
      <Modal
        open={open}
        title="Return for recount"
        okText="Return"
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            setOpen(false);
            form.resetFields();
            onReturn(v.comment);
          }}
        >
          <Form.Item
            name="comment"
            label="What should be recounted?"
            rules={[{ required: true, whitespace: true, message: 'Say what should be recounted.' }]}
          >
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
