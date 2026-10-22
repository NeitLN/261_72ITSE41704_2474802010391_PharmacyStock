import { Card, Tabs, Typography } from 'antd';
import { useAuth } from '../auth/authContext';
import { AlertsPanel } from './AlertsPanel';
import { PlaceholderPage } from './PlaceholderPage';
import { StockTakesPanel } from './StockTakesPanel';

/** UC09–UC12, one tab each; a tab shows only for the roles that can use it. */
export function ReportsPage() {
  const { can } = useAuth();
  const items = [
    can('stock_take.count') && {
      key: 'stock-takes',
      label: 'Stock takes',
      children: <StockTakesPanel />,
    },
    can('alert.manage') && {
      key: 'alerts',
      label: 'Low-stock alerts',
      children: <AlertsPanel />,
    },
    {
      key: 'later',
      label: 'Coming next',
      children: (
        <PlaceholderPage
          title="Not built yet"
          owner="Võ Hoàng Minh (C)"
          useCases={[
            'UC11 — Review expiry alerts, batch status and quarantined stock',
            'UC12 — Produce a stock movement report',
          ]}
        />
      ),
    },
  ].filter((item) => item !== false);

  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Stock control &amp; reports
      </Typography.Title>
      <Tabs destroyOnHidden items={items} />
    </Card>
  );
}
