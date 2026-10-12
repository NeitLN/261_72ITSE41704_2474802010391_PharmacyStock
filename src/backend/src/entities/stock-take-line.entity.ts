import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { StockTake } from './stock-take.entity.js';
import { Batch } from './batch.entity.js';

/** One counted batch and the discrepancy found against the book quantity. */
@Entity('stock_take_lines')
@Check('ck_stock_take_lines_system_qty', '"systemQuantity" >= 0')
@Check(
  'ck_stock_take_lines_counted_qty',
  '"countedQuantity" IS NULL OR "countedQuantity" >= 0',
)
export class StockTakeLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Sellable quantity of the batch when the stock take was opened. */
  @Column({ type: 'int' })
  systemQuantity: number;

  /** What was physically found; empty until counted. */
  @Column({ type: 'int', nullable: true })
  countedQuantity: number | null;

  /** Required whenever counted and system quantities differ (FR-30, TC-20). */
  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @ManyToOne(() => StockTake, (stockTake) => stockTake.lines, {
    nullable: false,
  })
  @JoinColumn({ name: 'stock_take_id' })
  stockTake: Relation<StockTake>;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch>;
}
