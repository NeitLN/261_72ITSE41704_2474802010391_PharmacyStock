import { PlaceholderPage } from './PlaceholderPage';

export function DispensingPage() {
  return (
    <PlaceholderPage
      title="Prescriptions & dispensing"
      owner="Bùi Duy Anh (B)"
      useCases={[
        'UC05 — Take in a prescription',
        'UC06 — Dispense against a prescription (BR01 FEFO, BR02, BR03, BR04)',
      ]}
    />
  );
}
