import { Card, Tabs, Typography } from 'antd';
import { useAuth } from '../auth/authContext';
import { AlertsPanel } from './AlertsPanel';
import { DestructionPanel } from './DestructionPanel';
import { ExpiryPanel } from './ExpiryPanel';
import { QuarantinePanel } from './QuarantinePanel';
import { StockMovementPanel } from './StockMovementPanel';
import { StockTakesPanel } from './StockTakesPanel';

/** UC09–UC12, with UC11's quarantine and destruction; a tab shows only for the roles that can use it. */
export function ReportsPage() {
  const { can } = useAuth();
  const items = [
    can('stock_take.count') && {
      key: 'stock-takes',
      label: 'Stock take',
      children: <StockTakesPanel />,
    },
    can('alert.manage') && {
      key: 'alerts',
      label: 'Alerts',
      children: <AlertsPanel />,
    },
    can('alert.manage') && {
      key: 'expiry',
      label: 'Expiry',
      children: <ExpiryPanel />,
    },
    can('batch_status.manage') && {
      key: 'quarantine',
      label: 'Quarantine',
      children: <QuarantinePanel />,
    },
    can('batch_status.manage') && {
      key: 'pending-destruction',
      label: 'Pending destruction',
      children: <DestructionPanel />,
    },
    can('report.view') && {
      key: 'stock-movement',
      label: 'Stock movement',
      children: <StockMovementPanel />,
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
