import {
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { medicinesApi, type Reference } from '../api/medicines';
import {
  type BatchState,
  type Movement,
  type MovementType,
  type StockBatch,
  type StockRow,
  type StockState,
  stockApi,
} from '../api/stock';
import { useLoad } from '../api/useLoad';

const PAGE_SIZE = 50;
const NO_REFERENCE = { categories: [] as Reference[], units: [] as Reference[] };
const NO_PAGE = { items: [] as StockRow[], total: 0, page: 1, pageSize: PAGE_SIZE };

const STATE_OPTIONS: Array<{ value: StockState; label: string }> = [
  { value: 'all', label: 'All stock states' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'has_expired', label: 'Has expired stock' },
];

const BATCH_TAGS: Record<BatchState, { color: string; label: string }> = {
  active: { color: 'green', label: 'Active' },
  expired: { color: 'red', label: 'Expired' },
  on_hold: { color: 'orange', label: 'On hold' },
  recalled: { color: 'volcano', label: 'Recalled' },
  rejected: { color: 'default', label: 'Rejected' },
};

const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: 'Receipt',
  dispense: 'Dispense',
  sale: 'Sale',
  return: 'Return',
  release: 'Release',
  reject: 'Reject',
  write_off: 'Write-off',
  destroy: 'Destroy',
  adjustment: 'Adjustment',
};

/** Movement times in pharmacy time, whatever the browser's zone. */
const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const signed = (n: number) => (n > 0 ? `+${n}` : n === 0 ? '' : `${n}`);

/** A quantity that is not sellable, greyed when zero. */
const muted = (n: number) =>
  n === 0 ? <Typography.Text type="secondary">0</Typography.Text> : n;

/** UC04 Look up stock and batch history (FR-10, FR-11). Read only. */
export function StockPanel() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [state, setState] = useState<StockState>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [openMedicine, setOpenMedicine] = useState<string | null>(null);

  const fetchReference = useCallback(() => medicinesApi.referenceData(), []);
  const { data: reference } = useLoad(fetchReference, NO_REFERENCE);

  const fetchStock = useCallback(
    () =>
      stockApi.list({
        search: search || undefined,
        categoryId,
        state,
        includeInactive,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, categoryId, state, includeInactive, page],
  );
  const { data: stock, loading } = useLoad(fetchStock, NO_PAGE);

  // A new filter starts again from the first page.
  function filter<T>(set: (v: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  const columns: ColumnsType<StockRow> = [
    { title: 'Code', width: 120, render: (_, r) => r.medicine.code },
    {
      title: 'Medicine',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span>
            {r.medicine.name} {!r.medicine.isActive && <Tag>Inactive</Tag>}
          </span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.medicine.category.name}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Sellable',
      align: 'right',
      width: 110,
      render: (_, r) => (
        <Typography.Text strong type={r.sellable === 0 ? 'danger' : undefined}>
          {r.sellable} <Typography.Text type="secondary">{r.medicine.baseUnit.name.toLowerCase()}</Typography.Text>
        </Typography.Text>
      ),
    },
    { title: 'Next expiry', width: 120, render: (_, r) => r.nextExpiry ?? '—' },
    { title: 'Expired', align: 'right', width: 90, render: (_, r) => muted(r.expired) },
    { title: 'Held', align: 'right', width: 80, render: (_, r) => muted(r.held) },
    { title: 'Quarantine', align: 'right', width: 110, render: (_, r) => muted(r.quarantine) },
    {
      title: 'Pending destruction',
      align: 'right',
      width: 110,
      render: (_, r) => muted(r.pendingDestruction),
    },
    {
      title: '',
      width: 100,
      render: (_, r) => (
        <Button size="small" onClick={() => setOpenMedicine(r.medicine.id)}>
          Batches
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Code, name or ingredient"
          onSearch={(value) => filter(setSearch)(value.trim())}
          style={{ width: 240 }}
        />
        <Select
          allowClear
          placeholder="All categories"
          value={categoryId}
          onChange={filter(setCategoryId)}
          options={reference.categories.map((c) => ({ value: c.id, label: c.name }))}
          style={{ width: 220 }}
        />
        <Select
          value={state}
          onChange={filter(setState)}
          options={STATE_OPTIONS}
          aria-label="Stock state"
          style={{ width: 180 }}
        />
        <Space>
          <Switch checked={includeInactive} onChange={filter(setIncludeInactive)} />
          <span>Show inactive</span>
        </Space>
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
        Sellable counts active batches that expire after today. Expired, held (on hold,
        recalled or rejected), quarantined and pending-destruction stock is shown apart and
        cannot be issued.
      </Typography.Paragraph>

      <Table
        rowKey={(r) => r.medicine.id}
        columns={columns}
        dataSource={stock.items}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: stock.total,
          onChange: setPage,
          hideOnSinglePage: true,
          showTotal: (total) => `${total} medicines`,
        }}
        locale={{ emptyText: 'No medicine matches these filters.' }}
        style={{ marginTop: 16 }}
      />

      <MedicineStockDrawer medicineId={openMedicine} onClose={() => setOpenMedicine(null)} />
    </>
  );
}

/** A medicine's batches with the quantity in each stock state (UC04 step 3). */
function MedicineStockDrawer({
  medicineId,
  onClose,
}: {
  medicineId: string | null;
  onClose: () => void;
}) {
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const fetchDetail = useCallback(
    () => (medicineId ? stockApi.medicine(medicineId) : Promise.resolve(null)),
    [medicineId],
  );
  const { data: detail, loading } = useLoad(fetchDetail, null);

  const columns: ColumnsType<StockBatch> = [
    { title: 'Batch', dataIndex: 'batchNumber' },
    { title: 'Expiry', dataIndex: 'expiryDate' },
    {
      title: 'State',
      render: (_, b) => (
        <Space size={4}>
          <Tag color={BATCH_TAGS[b.state].color}>{BATCH_TAGS[b.state].label}</Tag>
          {b.state === 'active' && (
            <Typography.Text type="secondary">{b.daysLeft} days left</Typography.Text>
          )}
        </Space>
      ),
    },
    { title: 'Sellable', align: 'right', dataIndex: 'qtySellable' },
    { title: 'Quarantine', align: 'right', render: (_, b) => muted(b.qtyQuarantine) },
    {
      title: 'Pending destruction',
      align: 'right',
      render: (_, b) => muted(b.qtyPendingDestruction),
    },
    {
      title: '',
      render: (_, b) => (
        <Button size="small" onClick={() => setOpenBatch(b.id)}>
          History
        </Button>
      ),
    },
  ];

  return (
    <Drawer
      open={medicineId !== null}
      onClose={onClose}
      width={900}
      title={detail ? `${detail.medicine.code} — ${detail.medicine.name}` : 'Batches'}
      destroyOnHidden
    >
      {detail && (
        <Descriptions size="small" column={5} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Sellable">
            <Typography.Text strong>{detail.totals.sellable}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Expired">{detail.totals.expired}</Descriptions.Item>
          <Descriptions.Item label="Held">{detail.totals.held}</Descriptions.Item>
          <Descriptions.Item label="Quarantine">{detail.totals.quarantine}</Descriptions.Item>
          <Descriptions.Item label="Pending destruction">
            {detail.totals.pendingDestruction}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={detail?.batches ?? []}
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'This medicine has no batches yet.' }}
      />
      <BatchHistoryModal batchId={openBatch} onClose={() => setOpenBatch(null)} />
    </Drawer>
  );
}

/** Every movement of a batch with the running balance (UC04 step 4, FR-11). */
function BatchHistoryModal({ batchId, onClose }: { batchId: string | null; onClose: () => void }) {
  const fetchHistory = useCallback(
    () => (batchId ? stockApi.history(batchId) : Promise.resolve(null)),
    [batchId],
  );
  const { data: history, loading } = useLoad(fetchHistory, null);

  const columns: ColumnsType<Movement> = [
    { title: 'Time', width: 170, render: (_, m) => formatTime(m.occurredAt) },
    {
      title: 'Type',
      width: 150,
      render: (_, m) => (
        <Space direction="vertical" size={0}>
          <span>
            {MOVEMENT_LABELS[m.type]} {m.reverses && <Tag color="purple">Correction</Tag>}
          </span>
          {m.reverses && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              reverses the {MOVEMENT_LABELS[m.reverses.type].toLowerCase()} of{' '}
              {formatTime(m.reverses.occurredAt)}
            </Typography.Text>
          )}
          {m.reversedBy && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              reversed on {formatTime(m.reversedBy.occurredAt)}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Sellable',
      align: 'right',
      render: (_, m) => (
        <span>
          {signed(m.deltaSellable)}{' '}
          <Typography.Text type="secondary">→ {m.balanceSellable}</Typography.Text>
        </span>
      ),
    },
    {
      title: 'Quarantine',
      align: 'right',
      render: (_, m) => (
        <span>
          {signed(m.deltaQuarantine)}{' '}
          <Typography.Text type="secondary">→ {m.balanceQuarantine}</Typography.Text>
        </span>
      ),
    },
    {
      title: 'Pending destr.',
      align: 'right',
      render: (_, m) => (
        <span>
          {signed(m.deltaPendingDestruction)}{' '}
          <Typography.Text type="secondary">→ {m.balancePendingDestruction}</Typography.Text>
        </span>
      ),
    },
    { title: 'By', render: (_, m) => m.performedBy.fullName },
    {
      title: 'Document',
      render: (_, m) => (
        <Space direction="vertical" size={0}>
          <span>{m.source.reference ?? '—'}</span>
          {m.reason && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {m.reason}
            </Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={batchId !== null}
      onCancel={onClose}
      footer={null}
      width={1100}
      title={
        history
          ? `Batch ${history.batch.batchNumber} — ${history.batch.medicine.name} (expires ${history.batch.expiryDate})`
          : 'Batch history'
      }
      destroyOnHidden
    >
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={history?.movements ?? []}
        loading={loading}
        pagination={false}
      />
    </Modal>
  );
}
