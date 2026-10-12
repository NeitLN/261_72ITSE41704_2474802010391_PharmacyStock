# Stock ledger

`src/backend/src/stock/stock-ledger.ts` is the only code that changes stock
(BR05, FR-12). It implements the concurrency protocol of Proposal v1.1 §3.1.
Every PR that uses it carries the `stock-integrity` label.

## Using it

```ts
await this.ledger.run(async (tx) => {
  await tx.lockMedicines([medicineId]);                         // 1. parents, ascending id
  const batches = await tx.lockEligibleBatches(medicineId, this.clock.today()); // 2. FEFO order
  // … decide quantities from the locked rows (FefoAllocator, BR01) …
  await tx.post(actor, {                                        // 3. one movement per change
    batchId: batches[0].id,
    type: MovementType.DISPENSE,
    deltaSellable: -3,
    sourceDocumentType: SourceDocumentType.DISPENSE_LINE,
    sourceDocumentId: line.id,
  });
  // save the document rows with tx.manager in the same transaction
});
```

| Method | Step | Notes |
|---|---|---|
| `run(work)` | — | One READ COMMITTED transaction, `lock_timeout = 5s`. A deadlock (40P01) retries the whole `work` once; a timeout becomes 409 *busy*. Any error rolls back everything (FR-09). |
| `lockMedicines(ids)` | 1 | `SELECT … FOR UPDATE` in ascending id. Must come before any batch lock; the transaction throws otherwise. |
| `lockBatches(ids)` | 2 | Specific batches, ascending id, fresh quantities. |
| `lockEligibleBatches(medicineId, date)` | 2 | ACTIVE, `expiryDate > date`, `qtySellable > 0`, ordered by expiry, first received, batch number, id (DEC-01, DEC-07). |
| `lockBatchByNumber(medicineId, number)` / `createBatch(input)` | 2 | Goods receipts: top up an existing batch or create one. |
| `post(actor, input)` | 3 | Batch must be locked in this transaction. Applies the deltas, refuses BR03 (no state below zero), writes the movement. |
| `reverse(actor, movementId, reason)` | 1–3 | The exact opposite movement, referencing the original; once only; a reversal cannot be reversed. |

`tx.manager` is the transaction's `EntityManager`: write the document
(receipt, dispense lines, sale) with it so the document and its movements
commit or roll back together.

## Movement types and signs

The database CHECK `ck_stock_movements_sign_by_type` enforces these; a
reversal (with `reversesMovement`) is exempt because it is the negation.

| Type | Sellable | Quarantine | Pending destruction |
|---|---|---|---|
| RECEIPT | + | | |
| DISPENSE, SALE | − | | |
| RETURN | | + | |
| RELEASE | + | − (same amount) | |
| REJECT | | − | + (same amount) |
| WRITE_OFF | − | | + (same amount) |
| DESTROY | | | − |
| ADJUSTMENT | ± | | |

## Safety nets

- CHECK constraints: no batch quantity below zero; movement signs per type.
- Trigger: `stock_movements` refuses UPDATE and DELETE.
- Unique `reverses_movement_id`: a movement is reversed at most once.
- `findLedgerMismatches()` (`stock/ledger-invariant.ts`): cached quantity =
  sum of movements for every batch and state. Call it at the end of every e2e
  test that changes stock.

## Tests

`src/stock/stock-deltas.spec.ts` (BR03 and reversal arithmetic, the business
clock) and `test/stock-ledger.e2e-spec.ts` (every movement type keeps the
invariant, reversal once, rollback of a whole command, lock order, eligible
batches in FEFO order, and a race for the last units repeated five times).
