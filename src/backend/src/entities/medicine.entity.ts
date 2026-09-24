import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Batch } from './batch.entity.js';
import { MedicineCategory } from './medicine-category.entity.js';
import { UnitOfMeasure } from './unit-of-measure.entity.js';
import { MedicinePrice } from './medicine-price.entity.js';

/**
 * A medicine in the pharmacy catalogue.
 * Stock is never held here directly: it lives on the individual batches,
 * because expiry tracking (BR01/BR02) is per batch.
 */
@Entity('medicines')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  activeIngredient: string;

  @Column({ nullable: true })
  strength: string;

  /** Controlled medicines require a valid prescription reference (BR04). */
  @Column({ default: false })
  isControlled: boolean;

  /** Low-stock alert threshold (UC10). */
  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  /** Batches expiring within this many days raise an alert (UC11). */
  @Column({ type: 'int', default: 90 })
  expiryAlertDays: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => MedicineCategory, (category) => category.medicines, {
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category: Relation<MedicineCategory>;

  /** Stock is always held and reported in this unit. */
  @ManyToOne(() => UnitOfMeasure, (unit) => unit.medicines, { nullable: false })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit: Relation<UnitOfMeasure>;

  @OneToMany(() => Batch, (batch) => batch.medicine)
  batches: Batch[];

  @OneToMany(() => MedicinePrice, (price) => price.medicine)
  prices: MedicinePrice[];
}
