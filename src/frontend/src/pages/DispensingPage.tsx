import { Card, Tabs, Typography } from 'antd';
import { useAuth } from '../auth/authContext';
import { CustomersPanel } from './CustomersPanel';
import { DispensePanel } from './DispensePanel';
import { PrescribersPanel } from './PrescribersPanel';
import { PrescriptionsPanel } from './PrescriptionsPanel';

/**
 * UC05 prescriptions, UC06 dispensing, and the UC14 customers and
 * prescribers they refer to, one tab each.
 */
export function DispensingPage() {
  const { can } = useAuth();
  const items = [
    { key: 'prescriptions', label: 'Prescriptions', children: <PrescriptionsPanel /> },
    { key: 'dispense', label: 'Dispense', children: <DispensePanel /> },
    can('prescription.manage') && {
      key: 'customers',
      label: 'Customers',
      children: <CustomersPanel />,
    },
    can('prescription.manage') && {
      key: 'prescribers',
      label: 'Prescribers',
      children: <PrescribersPanel />,
    },
  ].filter((item) => item !== false);
  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Prescriptions &amp; dispensing
      </Typography.Title>
      <Tabs destroyOnHidden items={items} />
    </Card>
  );
}
