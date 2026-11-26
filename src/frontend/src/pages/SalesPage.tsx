import { Card, Tabs, Typography } from 'antd';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { RecoveryResult, StartPageButton } from '../ui/RecoveryResult';
import { BillDispensingPanel } from './BillDispensingPanel';
import { SalesCartPanel } from './SalesCartPanel';
import { ReturnsPanel } from './ReturnsPanel';

/**
 * UC07 record a sale: the over-the-counter cart bills stock out of the shelf,
 * the second tab bills a hand-over already made in UC06 (no stock movement),
 * the third takes goods back into quarantine (UC08). A tab shows only for
 * the roles that can use it.
 */
export function SalesPage() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const items = [
    can('sale.create') && { key: 'otc', label: 'Over-the-counter sale', children: <SalesCartPanel /> },
    can('sale.create') && { key: 'bill', label: 'Bill a dispensing', children: <BillDispensingPanel /> },
    can('return.create') && { key: 'returns', label: 'Returns', children: <ReturnsPanel /> },
  ].filter(
    (item): item is { key: string; label: string; children: JSX.Element } => item !== false,
  );
  // `?tab=` opens that tab; an unknown key or one this role cannot see falls back to the first.
  const requested = searchParams.get('tab');
  const activeKey =
    requested && items.some((item) => item.key === requested) ? requested : items[0]?.key;
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
        Sales &amp; returns
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
