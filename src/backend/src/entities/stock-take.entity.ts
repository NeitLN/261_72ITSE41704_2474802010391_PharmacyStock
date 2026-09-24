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
import { User } from './user.entity.js';

export enum StockTakeStatus {
  DRAFT = 'draft',
  COUNTING = 'counting',
  /** Counted quantities have been posted as adjustments; no further edits. */
  POSTED = 'posted',
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

  @Column({ type: 'date' })
  countedDate: string;

  @Column({
    type: 'enum',
    enum: StockTakeStatus,
    default: StockTakeStatus.DRAFT,
  })
  status: StockTakeStatus;

  @Column({ nullable: true })
  note: string;

  @OneToMany(() => StockTakeLine, (line) => line.stockTake)
  lines: StockTakeLine[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'counted_by_id' })
  countedBy: Relation<User>;

  /** Must differ from countedBy: a count is approved by someone else (BR08). */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;
}
