import { PlaceholderPage } from './PlaceholderPage';

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="Stock control & reports"
      owner="Võ Hoàng Minh (C)"
      useCases={[
        'UC09 — Conduct a stock take (BR08)',
        'UC10 — Review low-stock alerts',
        'UC11 — Review expiry alerts, batch status and quarantined stock',
        'UC12 — Produce a stock movement report',
      ]}
    />
  );
}
