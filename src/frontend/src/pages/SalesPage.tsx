import { Card, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { BillDispensingPanel } from './BillDispensingPanel';
import { SalesCartPanel } from './SalesCartPanel';
import { ReturnsPanel } from './ReturnsPanel';

/**
 * UC07 record a sale: the over-the-counter cart bills stock out of the shelf,
 * the second tab bills a hand-over already made in UC06 (no stock movement),
 * the third takes goods back into quarantine (UC08).
 */
export function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const items = [
    { key: 'otc', label: 'Over-the-counter sale', children: <SalesCartPanel /> },
    { key: 'bill', label: 'Bill a dispensing', children: <BillDispensingPanel /> },
    { key: 'returns', label: 'Returns', children: <ReturnsPanel /> },
  ];
  // `?tab=` opens that tab; an unknown key falls back to the first.
  const requested = searchParams.get('tab');
  const activeKey = requested && items.some((item) => item.key === requested) ? requested : items[0].key;
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
