import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Actor } from '../src/auth/actor.js';
import { BusinessRuleViolation, Conflict } from '../src/common/errors.js';
import {
  Batch,
  BatchStatus,
  type Medicine,
  MovementType,
  SourceDocumentType,
  StockMovement,
} from '../src/entities/index.js';
import { findLedgerMismatches } from '../src/stock/ledger-invariant.js';
import { StockLedger } from '../src/stock/stock-ledger.js';
import { actorFor, createMedicine } from './e2e/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './e2e/helpers.js';

const DOC = '00000000-0000-4000-8000-0000000000d0';
const TODAY = '2026-10-12';

/** StockLedger against the real database: BR05, BR03 and the lock protocol. */
describe('StockLedger (e2e)', () => {
  let t: TestApp;
  let ledger: StockLedger;
  let manager: Actor;
  let medicine: Medicine;

  beforeAll(async () => {
    t = await createTestApp();
    ledger = t.app.get(StockLedger);
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.dataSource);
    manager = await actorFor(t.dataSource, 'manager');
    medicine = await createMedicine(t.dataSource);
  });

  /** Receives `quantity` into a new batch and returns its id. */
  function receive(
    batchNumber: string,
    quantity: number,
    expiryDate = '2027-06-30',
    receivedAt = new Date('2026-10-01T03:00:00Z'),
  ): Promise<string> {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([medicine.id]);
      const batch = await tx.createBatch({
        medicineId: medicine.id,
        batchNumber,
        expiryDate,
        unitCost: '1000',
        receivedAt,
      });
      await tx.post(manager, {
        batchId: batch.id,
        type: MovementType.RECEIPT,
        deltaSellable: quantity,
        sourceDocumentType: SourceDocumentType.GOODS_RECEIPT,
        sourceDocumentId: DOC,
      });
      return batch.id;
    });
  }

  /** Posts one movement against an existing batch in its own transaction. */
  function postTo(
    batchId: string,
    input: Partial<StockMovement> & { type: MovementType },
  ) {
    return ledger.run(async (tx) => {
      await tx.lockMedicines([medicine.id]);
      await tx.lockBatches([batchId]);
      return tx.post(manager, {
        batchId,
        sourceDocumentType: SourceDocumentType.BATCH,
        sourceDocumentId: batchId,
        ...input,
      } as never);
    });
  }

  const quantities = (id: string) =>
    t.dataSource
      .getRepository(Batch)
      .findOneOrFail({
        where: { id },
        select: {
          qtySellable: true,
          qtyQuarantine: true,
          qtyPendingDestruction: true,
        },
      })
      .then((b) => [b.qtySellable, b.qtyQuarantine, b.qtyPendingDestruction]);

  const movementCount = () => t.dataSource.getRepository(StockMovement).count();

  it('BR05-01 a receipt writes exactly one movement and the batch balances', async () => {
    const id = await receive('A1', 10);

    expect(await quantities(id)).toEqual([10, 0, 0]);
    expect(await movementCount()).toBe(1);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('BR05-02 every movement type keeps each stock state equal to its movements', async () => {
    const id = await receive('A1', 10);
    await postTo(id, { type: MovementType.SALE, deltaSellable: -3 });
    await postTo(id, { type: MovementType.RETURN, deltaQuarantine: 2 });
    await postTo(id, {
      type: MovementType.RELEASE,
      deltaQuarantine: -1,
      deltaSellable: 1,
    });
    await postTo(id, {
      type: MovementType.REJECT,
      deltaQuarantine: -1,
      deltaPendingDestruction: 1,
    });
    await postTo(id, {
      type: MovementType.WRITE_OFF,
      deltaSellable: -2,
      deltaPendingDestruction: 2,
      reason: 'Expired',
    });
    await postTo(id, {
      type: MovementType.DESTROY,
      deltaPendingDestruction: -3,
    });
    await postTo(id, {
      type: MovementType.ADJUSTMENT,
      deltaSellable: -1,
      reason: 'Count',
    });

    // 10 − 3 + 1 − 2 − 1 = 5 sellable; quarantine 2 − 1 − 1 = 0; pending 1 + 2 − 3 = 0
    expect(await quantities(id)).toEqual([5, 0, 0]);
    expect(await movementCount()).toBe(8);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('BR05-03 a correction is a new opposite movement, allowed once (TC-16)', async () => {
    const id = await receive('A1', 10);
    const sale = await postTo(id, {
      type: MovementType.SALE,
      deltaSellable: -4,
    });

    const reversal = await ledger.run((tx) =>
      tx.reverse(manager, sale.id, 'Keyed twice'),
    );
    expect(reversal).toMatchObject({
      deltaSellable: 4,
      type: MovementType.SALE,
    });
    expect(await quantities(id)).toEqual([10, 0, 0]);

    await expect(
      ledger.run((tx) => tx.reverse(manager, sale.id, 'Again')),
    ).rejects.toMatchObject({ code: 'ALREADY_REVERSED' });
    await expect(
      ledger.run((tx) => tx.reverse(manager, reversal.id, 'Undo the undo')),
    ).rejects.toBeInstanceOf(Conflict);

    // The original row is untouched and both rows remain: history is kept.
    expect(await movementCount()).toBe(3);
    expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
  });

  it('BR05-04 a reversal that would make stock negative is refused (BR03)', async () => {
    const id = await receive('A1', 5);
    const receipt = await t.dataSource
      .getRepository(StockMovement)
      .findOneByOrFail({ type: MovementType.RECEIPT });
    await postTo(id, { type: MovementType.SALE, deltaSellable: -4 });

    await expect(
      ledger.run((tx) => tx.reverse(manager, receipt.id, 'Wrong delivery')),
    ).rejects.toMatchObject({ rule: 'BR03' });
    expect(await quantities(id)).toEqual([1, 0, 0]);
    expect(await movementCount()).toBe(2);
  });

  it('BR05-05 the database refuses to update or delete a movement', async () => {
    await receive('A1', 5);

    await expect(
      t.dataSource.query(`UPDATE stock_movements SET "deltaSellable" = 50`),
    ).rejects.toThrow('append-only');
    await expect(
      t.dataSource.query(`DELETE FROM stock_movements`),
    ).rejects.toThrow('append-only');
  });

  it('BR05-06 a reason is required for a correction', async () => {
    await receive('A1', 5);
    const receipt = await t.dataSource
      .getRepository(StockMovement)
      .findOneByOrFail({});

    await expect(
      ledger.run((tx) => tx.reverse(manager, receipt.id, '  ')),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
  });

  it('BR03-01 over-issue is refused and the whole command rolls back (FR-09, TC-25)', async () => {
    const a = await receive('A1', 3);
    const b = await receive('B1', 8);

    await expect(
      ledger.run(async (tx) => {
        await tx.lockMedicines([medicine.id]);
        await tx.lockBatches([a, b]);
        await tx.post(manager, {
          batchId: b,
          type: MovementType.DISPENSE,
          deltaSellable: -2,
          sourceDocumentType: SourceDocumentType.DISPENSE_LINE,
          sourceDocumentId: DOC,
        });
        await tx.post(manager, {
          batchId: a,
          type: MovementType.DISPENSE,
          deltaSellable: -4,
          sourceDocumentType: SourceDocumentType.DISPENSE_LINE,
          sourceDocumentId: DOC,
        });
      }),
    ).rejects.toBeInstanceOf(BusinessRuleViolation);

    expect(await quantities(a)).toEqual([3, 0, 0]);
    expect(await quantities(b)).toEqual([8, 0, 0]);
    expect(await movementCount()).toBe(2);
  });

  it('LOCK-01 posting needs the batch locked, and medicines are locked before batches', async () => {
    const id = await receive('A1', 5);
    const other = await createMedicine(t.dataSource);

    await expect(
      ledger.run((tx) =>
        tx.post(manager, {
          batchId: id,
          type: MovementType.SALE,
          deltaSellable: -1,
          sourceDocumentType: SourceDocumentType.SALE_LINE,
          sourceDocumentId: DOC,
        }),
      ),
    ).rejects.toThrow('must be locked');

    await expect(ledger.run((tx) => tx.lockBatches([id]))).rejects.toThrow(
      'Lock order',
    );

    await expect(
      ledger.run(async (tx) => {
        await tx.lockMedicines([medicine.id]);
        await tx.lockBatches([id]);
        await tx.lockMedicines([other.id]);
      }),
    ).rejects.toThrow('Lock order');
  });

  it('LOCK-02 eligible batches: active, unexpired, in stock, in FEFO order (DEC-01, DEC-07)', async () => {
    const early = new Date('2026-09-01T03:00:00Z');
    const late = new Date('2026-09-20T03:00:00Z');
    const later = await receive('C-later', 5, '2027-03-31', early);
    const tieLate = await receive('B-tie-late', 5, '2026-12-31', late);
    const tieEarly = await receive('Z-tie-early', 5, '2026-12-31', early);
    await receive('X-expires-today', 5, TODAY);
    const onHold = await receive('H-on-hold', 5, '2026-11-30');
    await t.dataSource
      .getRepository(Batch)
      .update(onHold, { status: BatchStatus.ON_HOLD });
    const empty = await receive('E-empty', 2, '2026-11-15');
    await postTo(empty, { type: MovementType.SALE, deltaSellable: -2 });

    const eligible = await ledger.run(async (tx) => {
      await tx.lockMedicines([medicine.id]);
      return tx.lockEligibleBatches(medicine.id, TODAY);
    });

    expect(eligible.map((b) => b.id)).toEqual([tieEarly, tieLate, later]);
  });

  it('BR03-02 two commands racing for the last units: one succeeds, never negative (TC-26)', async () => {
    for (let run = 0; run < 5; run++) {
      await resetDatabase(t.dataSource);
      manager = await actorFor(t.dataSource, 'manager');
      medicine = await createMedicine(t.dataSource);
      const id = await receive('A1', 5);

      const take4 = () =>
        ledger.run(async (tx) => {
          await tx.lockMedicines([medicine.id]);
          const [batch] = await tx.lockEligibleBatches(medicine.id, TODAY);
          // Hold the lock a moment so the two transactions really overlap.
          await tx.manager.query('SELECT pg_sleep(0.05)');
          return tx.post(manager, {
            batchId: batch.id,
            type: MovementType.SALE,
            deltaSellable: -4,
            sourceDocumentType: SourceDocumentType.SALE_LINE,
            sourceDocumentId: DOC,
          });
        });

      const results = await Promise.allSettled([take4(), take4()]);
      const ok = results.filter((r) => r.status === 'fulfilled');
      const refused = results.filter(
        (r) =>
          r.status === 'rejected' && r.reason instanceof BusinessRuleViolation,
      );
      expect(ok).toHaveLength(1);
      expect(refused).toHaveLength(1);
      expect(await quantities(id)).toEqual([1, 0, 0]);
      expect(await findLedgerMismatches(t.dataSource)).toEqual([]);
    }
  });
});
