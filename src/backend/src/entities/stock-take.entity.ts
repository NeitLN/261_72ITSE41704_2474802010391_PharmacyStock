import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { StockTakeLine } from './stock-take-line.entity.js';
import { StockTakeMedicine } from './stock-take-medicine.entity.js';
import { User } from './user.entity.js';

export enum StockTakeStatus {
  /** Opened; counted quantities are being entered. */
  COUNTING = 'counting',
  /** Submitted by the counter; waiting for a different user to approve (BR08). */
  PENDING_APPROVAL = 'pending_approval',
  /** Differences posted as ADJUSTMENT movements; no further edits. */
  APPROVED = 'approved',
  CANCELLED = 'cancelled',
}

/**
 * A physical count of stock (UC09). Counting is separated from posting so a
 * discrepancy is reviewed before it changes the book quantity, and posting is
 * a single approved step rather than many silent edits.
 */
@Entity('stock_takes')
export class StockTake {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNumber: string;

  @Column({
    type: 'enum',
    enum: StockTakeStatus,
    default: StockTakeStatus.COUNTING,
  })
  status: StockTakeStatus;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @OneToMany(() => StockTakeLine, (line) => line.stockTake)
  lines: StockTakeLine[];

  /** The medicines chosen when it was opened (A3, #184). */
  @OneToMany(() => StockTakeMedicine, (chosen) => chosen.stockTake)
  medicines: StockTakeMedicine[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'opened_by_id' })
  openedBy: Relation<User>;

  /** The user who submitted the counts. */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'counted_by_id' })
  countedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /** Must differ from countedBy: a count is approved by someone else (BR08). */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
