import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { alertsApi, type StockAlert } from '../api/alerts';
import { batchesApi, type ExpiryReport } from '../api/batches';
import { type BillablePrescription, salesApi } from '../api/sales';
import { useLoad } from '../api/useLoad';
import { useAuth } from '../auth/authContext';

const NO_ALERTS: StockAlert[] = [];
const NO_BILLABLE: BillablePrescription[] = [];

/**
 * Role-aware overview (OC-45): a few counts from APIs that already exist.
 * Each card appears only for a role that may use the screen behind it; the
 * whole route is wired by Claude in App.tsx and the menu.
 */
export function DashboardPage() {
  const { can } = useAuth();
  const canAlerts = can('alert.manage');
  const canSales = can('sale.create');

  const fetchAlerts = useCallback(
    () => (canAlerts ? alertsApi.list({ status: 'unresolved' }) : Promise.resolve(NO_ALERTS)),
    [canAlerts],
  );
  const { data: alerts, loading: alertsLoading } = useLoad(fetchAlerts, NO_ALERTS);

  const fetchExpiry = useCallback(
    () => (canAlerts ? batchesApi.expiry() : Promise.resolve(null)),
    [canAlerts],
  );
  const { data: expiry, loading: expiryLoading } = useLoad<ExpiryReport | null>(fetchExpiry, null);

  const fetchBillable = useCallback(
    () => (canSales ? salesApi.billable() : Promise.resolve(NO_BILLABLE)),
    [canSales],
  );
  const { data: billable, loading: billableLoading } = useLoad(fetchBillable, NO_BILLABLE);

  const countOf = (type: StockAlert['type']) => alerts.filter((a) => a.type === type).length;
  const expiryAlerts = countOf('expiring_soon') + countOf('expired');
  const expiringBatches = expiry
    ? expiry.totals.expired.batches + expiry.totals.expiringSoon.batches
    : 0;
  const hasCards = canAlerts || canSales;

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Overview
      </Typography.Title>
      {hasCards ? (
        <Row gutter={[16, 16]}>
          {canAlerts && (
            <Col xs={24} md={12} xl={8}>
              <Card>
                <Statistic
                  title="Open alerts"
                  value={alerts.length}
                  loading={alertsLoading}
                />
                <Typography.Text type="secondary">
                  Low stock {countOf('low_stock')} · Out of stock {countOf('out_of_stock')} ·
                  Expiry {expiryAlerts}
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
                  title="Expiring soon"
                  value={expiringBatches}
                  suffix={expiringBatches === 1 ? 'batch' : 'batches'}
                  loading={expiryLoading}
                />
                <Typography.Text type="secondary">
                  Expired or inside their alert window.
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
                  value={billable.length}
                  loading={billableLoading}
                />
                <Typography.Text type="secondary">
                  Hand-overs with no sale yet.
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
