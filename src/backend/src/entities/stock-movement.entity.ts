import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Batch } from './batch.entity.js';
import { User } from './user.entity.js';

/**
 * What caused a movement. The sign of each stock-state delta is fixed per type
 * by a CHECK constraint (see the initial migration), except for a reversal,
 * which is the exact negation of the movement it reverses.
 */
export enum MovementType {
  /** + sellable (UC03). */
  RECEIPT = 'receipt',
  /** − sellable (UC06). */
  DISPENSE = 'dispense',
  /** − sellable (UC07). */
  SALE = 'sale',
  /** + quarantine: a returned item waits for assessment (UC08, BR11). */
  RETURN = 'return',
  /** quarantine → sellable after an approved assessment (FR-46). */
  RELEASE = 'release',
  /** quarantine → pending destruction after a failed assessment (FR-46). */
  REJECT = 'reject',
  /** sellable → pending destruction for an expired batch (FR-36). */
  WRITE_OFF = 'write_off',
  /** − pending destruction once a destruction record exists (FR-47). */
  DESTROY = 'destroy',
  /** ± sellable from an approved stock take (UC09). */
  ADJUSTMENT = 'adjustment',
}

/** The kind of document a movement belongs to, so history can link back to it. */
export enum SourceDocumentType {
  GOODS_RECEIPT = 'goods_receipt',
  DISPENSE_LINE = 'dispense_line',
  SALE_LINE = 'sale_line',
  RETURN_LINE = 'return_line',
  STOCK_TAKE_LINE = 'stock_take_line',
  BATCH = 'batch',
}

/**
 * Sign of each stock-state delta per movement type. A reversal is the exact
 * negation of the movement it reverses, so it is exempt.
 */
const SIGN_BY_TYPE = [
  `"reverses_movement_id" IS NOT NULL`,
  `("type" = 'receipt' AND "deltaSellable" > 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0)`,
  `("type" IN ('dispense', 'sale') AND "deltaSellable" < 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0)`,
  `("type" = 'return' AND "deltaSellable" = 0 AND "deltaQuarantine" > 0 AND "deltaPendingDestruction" = 0)`,
  `("type" = 'release' AND "deltaQuarantine" < 0 AND "deltaSellable" = -"deltaQuarantine" AND "deltaPendingDestruction" = 0)`,
  `("type" = 'reject' AND "deltaQuarantine" < 0 AND "deltaPendingDestruction" = -"deltaQuarantine" AND "deltaSellable" = 0)`,
  `("type" = 'write_off' AND "deltaSellable" < 0 AND "deltaPendingDestruction" = -"deltaSellable" AND "deltaQuarantine" = 0)`,
  `("type" = 'destroy' AND "deltaSellable" = 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" < 0)`,
  `("type" = 'adjustment' AND "deltaSellable" <> 0 AND "deltaQuarantine" = 0 AND "deltaPendingDestruction" = 0)`,
].join(' OR ');

/**
 * An append-only record of every change to batch stock (BR05).
 *
 * One stock change writes exactly one movement. A movement carries a signed
 * delta for each stock state, so a transfer between states (for example a
 * release from quarantine) is still a single row. For every batch and state,
 * the sum of the deltas equals the quantity cached on the batch.
 *
 * Rows are never updated or deleted (a trigger in the initial migration
 * refuses it); a
 * correction is a new movement that references the original through
 * `reversesMovement`, and each movement can be reversed at most once.
 */
@Entity('stock_movements')
@Check('ck_stock_movements_sign_by_type', SIGN_BY_TYPE)
@Check(
  'ck_stock_movements_not_empty',
  `"deltaSellable" <> 0 OR "deltaQuarantine" <> 0 OR "deltaPendingDestruction" <> 0`,
)
@Index('ix_stock_movements_batch_occurred', ['batch', 'occurredAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'int', default: 0 })
  deltaSellable: number;

  @Column({ type: 'int', default: 0 })
  deltaQuarantine: number;

  @Column({ type: 'int', default: 0 })
  deltaPendingDestruction: number;

  /** Required for adjustments, write-offs and reversals. */
  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: SourceDocumentType })
  sourceDocumentType: SourceDocumentType;

  /** Id of the receipt, dispense line, sale line, return line or stock-take line. */
  @Column({ type: 'uuid' })
  sourceDocumentId: string;

  /** Set on a correction; unique, so a movement is reversed at most once. */
  @OneToOne(() => StockMovement, { nullable: true })
  @JoinColumn({ name: 'reverses_movement_id' })
  reversesMovement: Relation<StockMovement> | null;

  @ManyToOne(() => Batch, (batch) => batch.movements, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: Relation<User>;

  /**
   * When the row was written. `clock_timestamp()`, not `now()`: `now()` is
   * when the transaction began, so a sale that began first and waited for a
   * lock would appear before the receipt whose stock it took (UC04).
   */
  @CreateDateColumn({ type: 'timestamptz', default: () => 'clock_timestamp()' })
  occurredAt: Date;
}
