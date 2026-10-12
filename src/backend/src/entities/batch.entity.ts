import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { StockMovement } from './stock-movement.entity.js';
import { User } from './user.entity.js';

/**
 * Whether a batch may be issued at all (DEC-07, FR-48). Expiry is not a
 * status: it is computed from `expiryDate` against the business date (BR02).
 */
export enum BatchStatus {
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  RECALLED = 'recalled',
  REJECTED = 'rejected',
}

/**
 * A single delivered lot of one medicine, with its own expiry date.
 *
 * Quantity is split by stock state (DEC-04): sellable stock can be issued,
 * quarantine holds returned goods waiting for assessment, and pending
 * destruction holds written-off or rejected goods until a destruction record
 * is made. Each column is a cache of the sum of the batch's stock movements in
 * that state (BR05); only StockLedger changes them.
 */
@Entity('batches')
@Unique('uq_batch_medicine_number', ['medicine', 'batchNumber'])
@Check('ck_batches_qty_sellable', '"qtySellable" >= 0')
@Check('ck_batches_qty_quarantine', '"qtyQuarantine" >= 0')
@Check('ck_batches_qty_pending_destruction', '"qtyPendingDestruction" >= 0')
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  batchNumber: string;

  /** A label with only month and year is stored as the last day of that month (DEC-01). */
  @Column({ type: 'date' })
  expiryDate: string;

  @Column({ type: 'int', default: 0 })
  qtySellable: number;

  @Column({ type: 'int', default: 0 })
  qtyQuarantine: number;

  @Column({ type: 'int', default: 0 })
  qtyPendingDestruction: number;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.ACTIVE })
  status: BatchStatus;

  @Column({ type: 'varchar', nullable: true })
  statusReason: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'status_changed_by_id' })
  statusChangedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt: Date | null;

  /** Cost per base unit from the first receipt; values stock in the movement report (DEC-06). */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitCost: string;

  /** When the batch was first received. Breaks FEFO ties (DEC-07). */
  @Column({ type: 'timestamptz' })
  receivedAt: Date;

  @ManyToOne(() => Medicine, (medicine) => medicine.batches, {
    nullable: false,
  })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  @OneToMany(() => StockMovement, (movement) => movement.batch)
  movements: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
