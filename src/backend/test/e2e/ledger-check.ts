import { afterEach, expect } from 'vitest';
import { findLedgerMismatches } from '../../src/stock/ledger-invariant.js';
import { openDataSources } from './helpers.js';

/**
 * NFR-08 after every e2e test: whatever the test did, every batch's cached
 * quantity in each stock state equals the sum of its movements. A test that
 * moves stock wrongly fails here even if its own assertions passed.
 */
afterEach(async () => {
  for (const dataSource of openDataSources) {
    if (!dataSource.isInitialized) continue;
    expect(await findLedgerMismatches(dataSource), 'ledger out of balance after this test').toEqual([]);
  }
});
