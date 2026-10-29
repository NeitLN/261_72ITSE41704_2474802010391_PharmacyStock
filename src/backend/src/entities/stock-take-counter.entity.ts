import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { StockTake } from './stock-take.entity.js';
import { User } from './user.entity.js';

/**
 * Everyone who saved a count on a stock take, kept even when someone else
 * later overwrites that count (#215). BR08 refuses all of them as approver;
 * the line's `countedBy` only remembers the latest.
 */
@Entity('stock_take_counters')
export class StockTakeCounter {
  @PrimaryColumn({ name: 'stock_take_id', type: 'uuid' })
  stockTakeId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => StockTake, { nullable: false })
  @JoinColumn({ name: 'stock_take_id' })
  stockTake: Relation<StockTake>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
