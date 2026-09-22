import { PlaceholderPage } from './PlaceholderPage';

export function CataloguePage() {
  return (
    <PlaceholderPage
      title="Medicine catalogue & batches"
      owner="Võ Việt Tiến (A)"
      useCases={[
        'UC01 — Manage medicine catalogue',
        'UC04 — Look up stock levels and batch history',
      ]}
    />
  );
}
