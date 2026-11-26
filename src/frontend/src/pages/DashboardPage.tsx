import { RightOutlined } from '@ant-design/icons';
import { Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { alertsApi, type StockAlert } from '../api/alerts';
import { type BatchView, batchesApi, type ExpiryReport, type QuarantineLine } from '../api/batches';
import { type BillablePrescription, salesApi } from '../api/sales';
import { type StockTakeSummary, stockTakesApi } from '../api/stockTakes';
import { useLoad } from '../api/useLoad';
import { useAuth } from '../auth/authContext';
import { palette } from '../ui/theme';

const NO_ALERTS: StockAlert[] = [];
const NO_BILLABLE: BillablePrescription[] = [];
const NO_TAKES: StockTakeSummary[] = [];
const NO_QUARANTINE: QuarantineLine[] = [];
const NO_BATCHES: BatchView[] = [];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Role-aware overview (OC-45). It starts with the work waiting now, most
 * urgent first, each line a link to the screen that handles it; the counts
 * follow. A role sees only what it may act on. A count that could not be
 * loaded shows "—", never 0, so a failed request is not read as "nothing to do".
 */
export function DashboardPage() {
  const { can } = useAuth();
  const canAlerts = can('alert.manage');
  const canSales = can('sale.create');
  const canApprove = can('stock_take.approve');
  const canBatches = can('batch_status.manage');

  const fetchAlerts = useCallback(
    () => (canAlerts ? alertsApi.list({ status: 'unresolved' }) : Promise.resolve(NO_ALERTS)),
    [canAlerts],
  );
  const { data: alerts, loading: alertsLoading, error: alertsError } = useLoad(fetchAlerts, NO_ALERTS);

  const fetchExpiry = useCallback(
    () => (canAlerts ? batchesApi.expiry() : Promise.resolve(null)),
    [canAlerts],
  );
  const { data: expiry, loading: expiryLoading, error: expiryError } = useLoad<ExpiryReport | null>(fetchExpiry, null);

  const fetchBillable = useCallback(
    () => (canSales ? salesApi.billable() : Promise.resolve(NO_BILLABLE)),
    [canSales],
  );
  const { data: billable, loading: billableLoading, error: billableError } = useLoad(fetchBillable, NO_BILLABLE);

  const fetchTakes = useCallback(
    () => (canApprove ? stockTakesApi.list('pending_approval') : Promise.resolve(NO_TAKES)),
    [canApprove],
  );
  const { data: pendingTakes } = useLoad(fetchTakes, NO_TAKES);

  const fetchQuarantine = useCallback(
    () => (canBatches ? batchesApi.quarantine() : Promise.resolve(NO_QUARANTINE)),
    [canBatches],
  );
  const { data: quarantine } = useLoad(fetchQuarantine, NO_QUARANTINE);

  const fetchDestruction = useCallback(
    () => (canBatches ? batchesApi.pendingDestruction() : Promise.resolve(NO_BATCHES)),
    [canBatches],
  );
  const { data: destruction } = useLoad(fetchDestruction, NO_BATCHES);

  const countOf = (type: StockAlert['type']) => alerts.filter((a) => a.type === type).length;
  const expired = expiry?.totals.expired.batches ?? 0;
  const expiringSoon = expiry?.totals.expiringSoon.batches ?? 0;
  const hasCards = canAlerts || canSales;

  // The work waiting now, most urgent first; a line appears only when there is something to do.
  const todo = [
    canAlerts && expired > 0 && {
      text: `${plural(expired, 'expired batch', 'expired batches')} still on the shelf — write off`,
      to: '/reports?tab=expiry',
      danger: true,
    },
    canAlerts && countOf('out_of_stock') > 0 && {
      text: `${plural(countOf('out_of_stock'), 'medicine', 'medicines')} out of stock`,
      to: '/reports?tab=alerts',
      danger: true,
    },
    canSales && billable.length > 0 && {
      text: `${plural(billable.length, 'dispensed prescription', 'dispensed prescriptions')} waiting for payment`,
      to: '/sales?tab=bill',
    },
    canApprove && pendingTakes.length > 0 && {
      text: `${plural(pendingTakes.length, 'stock take', 'stock takes')} waiting for your approval`,
      to: '/reports?tab=stock-takes',
    },
    canBatches && quarantine.length > 0 && {
      text: `${plural(quarantine.length, 'returned line', 'returned lines')} waiting in quarantine`,
      to: '/reports?tab=quarantine',
    },
    canBatches && destruction.length > 0 && {
      text: `${plural(destruction.length, 'batch', 'batches')} pending destruction`,
      to: '/reports?tab=pending-destruction',
    },
    canAlerts && countOf('low_stock') > 0 && {
      text: `${plural(countOf('low_stock'), 'medicine', 'medicines')} at or below the reorder level`,
      to: '/reports?tab=alerts',
    },
    canAlerts && expiringSoon > 0 && {
      text: `${plural(expiringSoon, 'batch', 'batches')} inside the expiry alert window`,
      to: '/reports?tab=expiry',
    },
  ].filter((t): t is { text: string; to: string; danger?: boolean } => Boolean(t));
  const stillLoading = alertsLoading || expiryLoading || billableLoading;

  /** A count, "—" when it could not be loaded, quieter when 0. */
  const big = (value: number, failed: boolean) => ({
    value: failed ? '—' : value,
    styles: { content: { fontSize: 32, color: !failed && value === 0 ? palette.textTertiary : undefined } },
  });

  return (
    <>
      <Typography.Title level={1} style={{ marginTop: 0, fontSize: 24 }}>
        Overview
      </Typography.Title>
      {hasCards ? (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="Next to handle">
              {stillLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
              ) : todo.length === 0 ? (
                <Typography.Text type="secondary">
                  Nothing is waiting. Alerts and payments appear here when they arrive.
                </Typography.Text>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {todo.map((t, i) => (
                    <li
                      key={t.text}
                      style={{ borderTop: i === 0 ? undefined : `1px solid ${palette.border}`, padding: '12px 0' }}
                    >
                      <Link to={t.to} style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text strong style={t.danger ? { color: palette.danger } : undefined}>
                          {t.text}
                        </Typography.Text>
                        <RightOutlined aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Col>
          {canAlerts && (
            <Col xs={24} md={12} xl={8}>
              <Card>
                <Statistic title="Open alerts" loading={alertsLoading} {...big(alerts.length, Boolean(alertsError))} />
                <Typography.Text type="secondary">
                  {alertsError
                    ? 'Could not be loaded.'
                    : `Low stock ${countOf('low_stock')} · Out of stock ${countOf('out_of_stock')} · Expired ${countOf('expired')} · Expiring soon ${countOf('expiring_soon')}`}
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Link to="/reports?tab=alerts">Open the alerts</Link>
                </div>
              </Card>
            </Col>
          )}
          {canAlerts && (
            <Col xs={24} md={12} xl={8}>
              <Card>
                <Statistic
                  title="Expired batches"
                  loading={expiryLoading}
                  {...big(expired, Boolean(expiryError))}
                  styles={{
                    content: {
                      fontSize: 32,
                      color: expiryError ? undefined : expired > 0 ? palette.danger : palette.textTertiary,
                    },
                  }}
                />
                <Typography.Text type="secondary">
                  {expiryError
                    ? 'Could not be loaded.'
                    : `${plural(expiringSoon, 'more batch expires', 'more batches expire')} inside the alert window.`}
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Link to="/reports?tab=expiry">Open the expiry list</Link>
                </div>
              </Card>
            </Col>
          )}
          {canSales && (
            <Col xs={24} md={12} xl={8}>
              <Card>
                <Statistic
                  title="Waiting for payment"
                  loading={billableLoading}
                  {...big(billable.length, Boolean(billableError))}
                />
                <Typography.Text type="secondary">
                  {billableError ? 'Could not be loaded.' : 'Dispensed prescriptions with no sale yet.'}
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Link to="/sales?tab=bill">Open the sales screen</Link>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      ) : (
        <Typography.Paragraph>Choose a screen from the menu.</Typography.Paragraph>
      )}
    </>
  );
}
