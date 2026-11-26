import { Card, Tabs, Typography } from 'antd';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  ].filter(
    (item): item is { key: string; label: string; children: JSX.Element } => item !== false,
  );
  // `?tab=` opens that tab (`&rx=` picks a prescription on Dispense); unknown keys fall back to the first.
  const requested = searchParams.get('tab');
  const activeKey =
    requested && items.some((item) => item.key === requested) ? requested : items[0]?.key;
  if (items.length === 0) {
    return (
      <RecoveryResult
        icon="noScreens"
        title="Nothing here for your role"
        text="Your role has no screen on this page. Ask the manager if you need one."
        action={<StartPageButton />}
      />
    );
  }

  return (
    <Card>
      <Typography.Title level={1} style={{ marginTop: 0, fontSize: 24 }}>
        Prescriptions &amp; dispensing
      </Typography.Title>
      <Tabs
        destroyOnHidden
        items={items}
        activeKey={activeKey}
        onChange={(key) => setSearchParams({ tab: key }, { replace: true })}
      />
    </Card>
  );
}
