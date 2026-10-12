import { PlaceholderPage } from './PlaceholderPage';

export function SalesPage() {
  return (
    <PlaceholderPage
      title="Sales & returns"
      owner="Bùi Duy Anh (B)"
      useCases={[
        'UC07 — Record a sale (OTC only; BR01, BR02, BR04)',
        'UC08 — Process a return into quarantine (BR05, BR11)',
      ]}
    />
  );
}
