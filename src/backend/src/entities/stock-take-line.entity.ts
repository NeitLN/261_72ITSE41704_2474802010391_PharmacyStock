import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockTake } from './stock-take.entity.js';
import { Batch } from './batch.entity.js';

/** One counted batch and the discrepancy found against the book quantity. */
@Entity('stock_take_lines')
export class StockTakeLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** What the system believed at the moment of counting. */
  @Column({ type: 'int' })
  systemQuantity: number;

  /** What was physically found. */
  @Column({ type: 'int' })
  countedQuantity: number;

  /** Required whenever counted and system quantities differ (TC-20). */
  @Column({ nullable: true })
  reason: string;

  @ManyToOne(() => StockTake, (stockTake) => stockTake.lines, {
    nullable: false,
  })
  @JoinColumn({ name: 'stock_take_id' })
  stockTake: StockTake;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;
}
