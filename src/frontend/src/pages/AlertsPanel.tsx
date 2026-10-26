import { App, Button, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useState } from 'react';
import {
  type AlertListStatus,
  type AlertType,
  alertsApi,
  type StockAlert,
} from '../api/alerts';
import { toApiError } from '../api/errors';
import { useLoad } from '../api/useLoad';
import { StatusTag } from '../ui/tags';

const NO_ALERTS: StockAlert[] = [];

const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

/**
 * UC10 Review low-stock alerts. The system raises and resolves them as stock
 * moves; the manager acknowledges them so the team can see who has seen one.
 */
export function AlertsPanel() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<AlertListStatus>('unresolved');
  const [type, setType] = useState<AlertType | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const fetchAlerts = useCallback(() => alertsApi.list({ status, type }), [status, type]);
  const { data: alerts, loading, reload } = useLoad(fetchAlerts, NO_ALERTS);

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

  const columns: ColumnsType<StockAlert> = [
    {
      title: 'Alert',
      width: 140,
      render: (_, a) => <StatusTag kind="stockAlert" value={a.type} />,
    },
    { title: 'Medicine', render: (_, a) => `${a.medicine.code} — ${a.medicine.name}` },
    {
      title: 'Batch',
      width: 170,
      render: (_, a) => (a.batch ? `${a.batch.batchNumber} · ${a.batch.expiryDate}` : '—'),
    },
    { title: 'Sellable now', width: 120, align: 'right', render: (_, a) => a.sellable },
    {
      title: 'Reorder level',
      width: 120,
      align: 'right',
      render: (_, a) => (a.batch ? '—' : a.medicine.reorderLevel),
    },
    { title: 'Raised', width: 170, render: (_, a) => dateTime(a.raisedAt) },
    {
      title: 'Status',
      width: 230,
      render: (_, a) => {
        if (a.status === 'resolved') return `Resolved ${dateTime(a.resolvedAt)}`;
        if (a.status === 'acknowledged')
          return `Seen by ${a.acknowledgedBy?.fullName ?? '—'}, ${dateTime(a.acknowledgedAt)}`;
        return <Tag color="blue">New</Tag>;
      },
    },
    {
      title: '',
      key: 'ack',
      width: 120,
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
      <Table
        rowKey="id"
        columns={columns}
        dataSource={alerts}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No monitored medicine is at or below its reorder level.' }}
        style={{ marginTop: 16 }}
      />
    </>
  );
}
