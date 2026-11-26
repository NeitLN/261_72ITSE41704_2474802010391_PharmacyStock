import { App, Button, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  type AlertListStatus,
  type AlertType,
  alertsApi,
  type StockAlert,
} from '../api/alerts';
import { toApiError } from '../api/errors';
import { useLoad } from '../api/useLoad';
import { LoadFailed } from '../ui/LoadFailed';
import { formatDateTime } from '../ui/format';
import { StatusTag } from '../ui/tags';

const NO_ALERTS: StockAlert[] = [];

/** The empty text names what the filters asked for (#299). */
const EMPTY_BY_TYPE: Record<AlertType, string> = {
  low_stock: 'No low-stock alert matches.',
  out_of_stock: 'No out-of-stock alert matches.',
  expiring_soon: 'No expiring-soon alert matches.',
  expired: 'No expired-batch alert matches.',
};
const emptyText = (type: AlertType | undefined) => (type ? EMPTY_BY_TYPE[type] : 'No alerts match.');

/**
 * UC10 Review low-stock alerts. The system raises and resolves them as stock
 * moves; the manager acknowledges them so the team can see who has seen one.
 */
export function AlertsPanel() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<AlertListStatus>('unresolved');
  const [type, setType] = useState<AlertType | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const fetchAlerts = useCallback(() => alertsApi.list({ status, type }), [status, type]);
  const { data: alerts, loading, error: loadError, reload } = useLoad(fetchAlerts, NO_ALERTS);

  async function acknowledge(alert: StockAlert) {
    setBusyId(alert.id);
    try {
      await alertsApi.acknowledge(alert.id);
      message.success(`Acknowledged: ${alert.medicine.name}.`);
    } catch (error) {
      message.error(toApiError(error).message);
    } finally {
      setBusyId(null);
      reload();
    }
  }

  async function acknowledgeSelected() {
    setBulkBusy(true);
    let done = 0;
    const failed: string[] = [];
    for (const id of selected) {
      try {
        await alertsApi.acknowledge(id);
        done += 1;
      } catch (error) {
        failed.push(toApiError(error).message);
      }
    }
    setBulkBusy(false);
    setSelected([]);
    if (done > 0) message.success(`${done} ${done === 1 ? 'alert' : 'alerts'} acknowledged.`);
    if (failed.length > 0) message.error(`${failed.length} not acknowledged: ${failed[0]}`);
    reload();
  }

  const columns: ColumnsType<StockAlert> = [
    {
      title: 'Alert',
      width: 140,
      render: (_, a) => <StatusTag kind="stockAlert" value={a.type} />,
    },
    { title: 'Medicine', width: 240, render: (_, a) => `${a.medicine.code} — ${a.medicine.name}` },
    {
      // An expiry alert is about one batch: its quantity is shown here, not as "sellable".
      title: 'Batch',
      width: 200,
      render: (_, a) =>
        a.batch ? (
          <>
            <span className="nowrap">{a.batch.batchNumber}</span> ·{' '}
            <span className="nowrap">exp. {a.batch.expiryDate}</span>
            <div>
              <Typography.Text type="secondary">{a.sellable} on shelf</Typography.Text>{' '}
              {a.type === 'expired' && <Link to="/reports?tab=expiry">Write off</Link>}
            </div>
          </>
        ) : (
          '—'
        ),
    },
    {
      title: 'Sellable now',
      width: 110,
      align: 'right',
      render: (_, a) => (a.batch ? '—' : a.sellable),
    },
    {
      title: 'Reorder level',
      width: 120,
      align: 'right',
      render: (_, a) => (a.batch ? '—' : a.medicine.reorderLevel),
    },
    { title: 'Raised', width: 150, className: 'nowrap', render: (_, a) => formatDateTime(a.raisedAt) },
    {
      title: 'Status',
      width: 170,
      render: (_, a) => {
        if (a.status === 'resolved') return `Resolved ${formatDateTime(a.resolvedAt)}`;
        if (a.status === 'acknowledged')
          return `Seen by ${a.acknowledgedBy?.fullName ?? '—'}, ${formatDateTime(a.acknowledgedAt)}`;
        return <StatusTag kind="alertProgress" value="new" />;
      },
    },
    {
      title: '',
      key: 'ack',
      width: 120,
      fixed: 'right',
      render: (_, a) =>
        a.status === 'open' && (
          <Button size="small" loading={busyId === a.id} onClick={() => acknowledge(a)}>
            Acknowledge
          </Button>
        ),
    },
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        Stock-level alerts count only stock that can be issued: expired, on-hold, recalled and
        quarantined units are left out. Expiry alerts are per batch, within each medicine’s alert
        window. An alert closes by itself when its condition no longer holds.
      </Typography.Paragraph>
      <Space wrap>
        <Select
          style={{ width: 180 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'unresolved', label: 'Not resolved' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Select
          allowClear
          placeholder="Any type"
          style={{ width: 180 }}
          value={type}
          onChange={setType}
          options={[
            { value: 'out_of_stock', label: 'Out of stock' },
            { value: 'expired', label: 'Expired' },
            { value: 'low_stock', label: 'Low stock' },
            { value: 'expiring_soon', label: 'Expiring soon' },
          ]}
        />
      </Space>
      {loadError && <LoadFailed error={loadError} onRetry={reload} />}
      <div style={{ marginTop: 16 }}>
        <Button disabled={selected.length === 0} loading={bulkBusy} onClick={acknowledgeSelected}>
          Acknowledge selected ({selected.length})
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        scroll={{ x: 'max-content' }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as string[]),
          getCheckboxProps: (a) => ({
            disabled: a.status !== 'open',
            'aria-label': `Select the alert for ${a.medicine.name}`,
          }),
        }}
        dataSource={alerts}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: emptyText(type) }}
        style={{ marginTop: 16 }}
      />
    </>
  );
}
