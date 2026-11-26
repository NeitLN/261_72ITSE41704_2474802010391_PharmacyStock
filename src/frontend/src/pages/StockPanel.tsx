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
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { medicinesApi, type Reference } from '../api/medicines';
import {
  type Movement,
  type MovementType,
  type StockBatch,
  type StockRow,
  type StockState,
  stockApi,
} from '../api/stock';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { formatDateTime } from '../ui/format';
import { StatusTag } from '../ui/tags';
import { LabelledSwitch, ListToolbar } from '../ui/ListToolbar';

const PAGE_SIZE = 50;
const NO_REFERENCE = { categories: [] as Reference[], units: [] as Reference[] };
const NO_PAGE = { items: [] as StockRow[], total: 0, page: 1, pageSize: PAGE_SIZE };

const STATE_OPTIONS: Array<{ value: StockState; label: string }> = [
  { value: 'all', label: 'All stock states' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'has_expired', label: 'Has expired stock' },
];


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
  const { data: stock, loading, error: loadError } = useLoad(fetchStock, NO_PAGE);

  // A new filter starts again from the first page.
  function filter<T>(set: (v: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  const columns: ColumnsType<StockRow> = [
    { title: 'Code', width: 110, className: 'nowrap', render: (_, r) => r.medicine.code },
    {
      title: 'Medicine',
      width: 240,
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <span>
            {r.medicine.name} {!r.medicine.isActive && <StatusTag kind="record" value="inactive" />}
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
      width: 120,
      className: 'nowrap',
      render: (_, r) => (
        <Typography.Text strong type={r.sellable === 0 ? 'danger' : undefined}>
          {r.sellable} <Typography.Text type="secondary">{r.medicine.baseUnit.name.toLowerCase()}</Typography.Text>
        </Typography.Text>
      ),
    },
    { title: 'Next expiry', width: 120, className: 'nowrap', render: (_, r) => r.nextExpiry ?? '—' },
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
      fixed: 'right',
      render: (_, r) => (
        <Button size="small" aria-label={`Batches of ${r.medicine.name}`} onClick={() => setOpenMedicine(r.medicine.id)}>
          Batches
        </Button>
      ),
    },
  ];

  return (
    <>
      <ListToolbar>
        <Input.Search
          allowClear
          placeholder="Code, name or ingredient"
          aria-label="Search by code, name or ingredient"
          onSearch={(value) => filter(setSearch)(value.trim())}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="All categories"
          aria-label="Category"
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
        <LabelledSwitch>
          <Switch checked={includeInactive} onChange={filter(setIncludeInactive)} />
          Show inactive
        </LabelledSwitch>
      </ListToolbar>
      <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
        Sellable counts active batches that expire after today. Expired, held (on hold,
        recalled or rejected), quarantined and pending-destruction stock is shown apart and
        cannot be issued.
      </Typography.Paragraph>

      {loadError && <LoadFailed error={loadError} />}
      <Table
        rowKey={(r) => r.medicine.id}
        columns={columns}
        scroll={{ x: 'max-content' }}
        dataSource={stock.items}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: stock.total,
          onChange: setPage,
          hideOnSinglePage: true,
          // The page size is fixed (UC04 decisions), so no size picker.
          showSizeChanger: false,
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
  const { data: detail, loading, error: detailError, reload: reloadDetail } = useLoad(fetchDetail, null);

  const columns: ColumnsType<StockBatch> = [
    { title: 'Batch', dataIndex: 'batchNumber', className: 'nowrap' },
    { title: 'Expiry', dataIndex: 'expiryDate', className: 'nowrap' },
    {
      title: 'State',
      render: (_, b) => (
        <Space size={4}>
          <StatusTag kind="batch" value={b.state} />
          {b.state === 'active' && (
            <Typography.Text type="secondary" className="nowrap">
              {b.daysLeft === 1 ? '1 day' : `${b.daysLeft} days`} left
            </Typography.Text>
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
        <Button size="small" aria-label={`History of batch ${b.batchNumber}`} onClick={() => setOpenBatch(b.id)}>
          History
        </Button>
      ),
    },
  ];

  return (
    <Drawer
      open={medicineId !== null}
      onClose={onClose}
      size={900}
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
      {detailError && <LoadFailed error={detailError} onRetry={reloadDetail} />}
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
  const { data: history, loading, error: historyError, reload: reloadHistory } = useLoad(fetchHistory, null);

  const columns: ColumnsType<Movement> = [
    { title: 'Time', width: 150, className: 'nowrap', render: (_, m) => formatDateTime(m.occurredAt) },
    {
      title: 'Type',
      width: 150,
      render: (_, m) => (
        <Space orientation="vertical" size={0}>
          <span>
            {MOVEMENT_LABELS[m.type]}
            {m.reverses && (
              <Typography.Text type="secondary"> (correction)</Typography.Text>
            )}
          </span>
          {m.reverses && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              reverses the {MOVEMENT_LABELS[m.reverses.type].toLowerCase()} of{' '}
              {formatDateTime(m.reverses.occurredAt)}
            </Typography.Text>
          )}
          {m.reversedBy && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              reversed on {formatDateTime(m.reversedBy.occurredAt)}
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
          <span className={m.deltaSellable === 0 ? 'qty-zero' : undefined}>{signed(m.deltaSellable)}</span>
          <Typography.Text type="secondary" className="nowrap"> · balance {m.balanceSellable}</Typography.Text>
        </span>
      ),
    },
    {
      title: 'Quarantine',
      align: 'right',
      render: (_, m) => (
        <span>
          <span className={m.deltaQuarantine === 0 ? 'qty-zero' : undefined}>{signed(m.deltaQuarantine)}</span>
          <Typography.Text type="secondary" className="nowrap"> · balance {m.balanceQuarantine}</Typography.Text>
        </span>
      ),
    },
    {
      title: 'Pending destruction',
      align: 'right',
      render: (_, m) => (
        <span>
          <span className={m.deltaPendingDestruction === 0 ? 'qty-zero' : undefined}>{signed(m.deltaPendingDestruction)}</span>
          <Typography.Text type="secondary" className="nowrap"> · balance {m.balancePendingDestruction}</Typography.Text>
        </span>
      ),
    },
    { title: 'By', render: (_, m) => m.performedBy.fullName },
    {
      title: 'Document',
      render: (_, m) => (
        <Space orientation="vertical" size={0}>
          {/* A write-off or status change belongs to the batch itself: no document number. */}
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
      {historyError && <LoadFailed error={historyError} onRetry={reloadHistory} />}
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        scroll={{ x: 'max-content' }}
        dataSource={history?.movements ?? []}
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'No movement recorded for this batch.' }}
      />
    </Modal>
  );
}
