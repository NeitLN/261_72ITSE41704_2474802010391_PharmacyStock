import { PlaceholderPage } from './PlaceholderPage';

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="Stock alerts & reports"
      owner="Võ Hoàng Minh (C)"
      useCases={[
        'UC09 — Stock take and adjustments',
        'UC10 — Low stock alerts',
        'UC11 — Expiry report',
        'UC12 — Turnover report',
      ]}
    />
  );
}
