import { Card, Tabs, Typography } from 'antd';
import { BillDispensingPanel } from './BillDispensingPanel';
import { SalesCartPanel } from './SalesCartPanel';

/**
 * UC07 record a sale: the over-the-counter cart bills stock out of the shelf,
 * the second tab bills a hand-over already made in UC06 (no stock movement).
 */
export function SalesPage() {
  const items = [
    { key: 'otc', label: 'Over-the-counter sale', children: <SalesCartPanel /> },
    { key: 'bill', label: 'Bill a dispensing', children: <BillDispensingPanel /> },
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
