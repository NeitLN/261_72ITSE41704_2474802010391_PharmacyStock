import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { User } from './user.entity.js';

/**
 * A selling price for a medicine, in force from `effectiveFrom` until the next
 * price of the same medicine starts.
 *
 * Prices are kept as a history rather than a single column so a sale made last
 * month can still be explained, and so a price change never silently rewrites
 * past figures (BR09). The price in force on a date is the row with the latest
 * `effectiveFrom` on or before that date.
 */
@Entity('medicine_prices')
@Unique('uq_medicine_price_effective_from', ['medicine', 'effectiveFrom'])
@Check('ck_medicine_prices_positive', '"unitPrice" > 0')
export class MedicinePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** VND per base unit. */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @ManyToOne(() => Medicine, (medicine) => medicine.prices, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'set_by_id' })
  setBy: Relation<User>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
