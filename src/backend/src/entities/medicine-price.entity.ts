import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { User } from './user.entity.js';

/**
 * A dated selling price for a medicine.
 *
 * Prices are kept as a history rather than a single column so a sale made last
 * month can still be explained, and so a price change never silently rewrites
 * past figures in the turnover report (BR09).
 */
@Entity('medicine_prices')
export class MedicinePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({ type: 'date' })
  effectiveFrom: string;

  /** Null means this is the price currently in force. */
  @Column({ type: 'date', nullable: true })
  effectiveTo: string;

  @ManyToOne(() => Medicine, (medicine) => medicine.prices, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'set_by_id' })
  setBy: Relation<User>;
}
