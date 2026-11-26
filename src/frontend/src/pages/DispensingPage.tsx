import { Card, Tabs, Typography } from 'antd';
import { useAuth } from '../auth/authContext';
import { RecoveryResult, StartPageButton } from '../ui/RecoveryResult';
import { CustomersPanel } from './CustomersPanel';
import { DispensePanel } from './DispensePanel';
import { PrescribersPanel } from './PrescribersPanel';
import { PrescriptionsPanel } from './PrescriptionsPanel';

/**
 * UC05 prescriptions, UC06 dispensing, and the UC14 customers and
 * prescribers they refer to, one tab each, shown only for the roles that
 * can use it.
 */
export function DispensingPage() {
  const { can } = useAuth();
  const items = [
    can('prescription.manage') && {
      key: 'prescriptions',
      label: 'Prescriptions',
      children: <PrescriptionsPanel />,
    },
    can('dispense') && { key: 'dispense', label: 'Dispense', children: <DispensePanel /> },
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
  if (items.length === 0) {
    return (
      <RecoveryResult
        icon="noScreens"
        title="Nothing here for your role"
        text="Your role has no screen on this page. Ask the administrator if you need one."
        action={<StartPageButton />}
      />
    );
  }

  return (
    <Card>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Prescriptions &amp; dispensing
      </Typography.Title>
      <Tabs destroyOnHidden items={items} />
    </Card>
  );
}
