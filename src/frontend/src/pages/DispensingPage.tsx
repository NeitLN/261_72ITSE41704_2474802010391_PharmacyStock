import { Card, Tabs, Typography } from 'antd';
import { DispensePanel } from './DispensePanel';
import { PrescriptionsPanel } from './PrescriptionsPanel';

/** UC05 prescriptions and UC06 dispensing, one tab each. */
export function DispensingPage() {
  const items = [
    { key: 'prescriptions', label: 'Prescriptions', children: <PrescriptionsPanel /> },
    { key: 'dispense', label: 'Dispense', children: <DispensePanel /> },
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
