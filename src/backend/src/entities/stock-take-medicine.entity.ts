import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { StockTake } from './stock-take.entity.js';

/**
 * A medicine chosen when a stock take was opened (#184). Kept apart from the
 * lines because a chosen medicine with no stock on the book gets no line, yet
 * the counter may still add any of its batches (A3). An entity of its own,
 * not a many-to-many, so both foreign keys are NO ACTION like the rest of the
 * schema: a medicine on a past stock take cannot be deleted from under it.
 */
@Entity('stock_take_medicines')
export class StockTakeMedicine {
  @PrimaryColumn({ name: 'stock_take_id', type: 'uuid' })
  stockTakeId: string;

  @PrimaryColumn({ name: 'medicine_id', type: 'uuid' })
  medicineId: string;

  @ManyToOne(() => StockTake, (stockTake) => stockTake.medicines, {
    nullable: false,
  })
  @JoinColumn({ name: 'stock_take_id' })
  stockTake: Relation<StockTake>;

  @ManyToOne(() => Medicine, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;
}
