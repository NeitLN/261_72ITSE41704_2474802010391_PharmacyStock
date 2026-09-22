import { PlaceholderPage } from './PlaceholderPage';

export function DispensingPage() {
  return (
    <PlaceholderPage
      title="Prescriptions & dispensing"
      owner="Bùi Duy Anh (B)"
      useCases={[
        'UC05 — Take in a prescription',
        'UC06 — Dispense against a prescription (BR01, BR02, BR03, BR04, BR07, BR10)',
        'UC14 — Manage customers and prescribers',
      ]}
    />
  );
}
