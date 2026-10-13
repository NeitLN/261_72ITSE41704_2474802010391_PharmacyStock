import { Card, Tabs, Typography } from 'antd';
import { PrescriptionsPanel } from './PrescriptionsPanel';

/**
 * UC05 prescriptions and UC06 dispensing, one tab each.
 * The dispense tab arrives with OC-05; it only appends an item below.
 */
export function DispensingPage() {
  const items = [
    { key: 'prescriptions', label: 'Prescriptions', children: <PrescriptionsPanel /> },
  ];
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Prescriptions &amp; dispensing
      </Typography.Title>
      <Tabs destroyOnHidden items={items} />
    </Card>
  );
}
