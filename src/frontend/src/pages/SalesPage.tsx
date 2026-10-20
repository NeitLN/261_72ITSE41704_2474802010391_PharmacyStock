import { Card, Tabs, Typography } from 'antd';
import { SalesCartPanel } from './SalesCartPanel';

/**
 * UC07 record a sale. The over-the-counter cart lives in the first tab.
 * Billing a dispensing is added to this page later (#50).
 */
export function SalesPage() {
  const items = [
    { key: 'otc', label: 'Over-the-counter sale', children: <SalesCartPanel /> },
    {
      key: 'returns',
      label: 'Returns (UC08)',
      children: (
        <Typography.Text type="secondary">Not built yet</Typography.Text>
      ),
    },
  ];
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Sales &amp; returns
      </Typography.Title>
      <Tabs destroyOnHidden items={items} />
    </Card>
  );
}
