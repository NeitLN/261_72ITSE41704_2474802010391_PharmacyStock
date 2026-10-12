import {
  Check,
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
 * How a medicine may be issued (DEC-09). Only OTC medicines can be sold over
 * the counter; every other medicine needs a verified prescription (BR04).
 */
export enum MedicineClassification {
  OTC = 'otc',
  PRESCRIPTION = 'prescription',
  CONTROLLED = 'controlled',
}

/**
 * A medicine in the pharmacy catalogue.
 * Stock is never held here directly: it lives on the individual batches,
 * because expiry tracking (BR01/BR02) is per batch.
 */
@Entity('medicines')
@Check('ck_medicines_reorder_level', '"reorderLevel" >= 0')
@Check('ck_medicines_expiry_alert_days', '"expiryAlertDays" >= 0')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  activeIngredient: string | null;

  @Column({ type: 'varchar', nullable: true })
  strength: string | null;

  /** New medicines default to PRESCRIPTION; OTC is set only from a recorded source (DEC-09). */
  @Column({
    type: 'enum',
    enum: MedicineClassification,
    default: MedicineClassification.PRESCRIPTION,
  })
  classification: MedicineClassification;

  /** Where the classification comes from, e.g. the registration number or label. */
  @Column({ type: 'varchar', nullable: true })
  classificationSource: string | null;

  @Column({ type: 'date', nullable: true })
  classificationDate: string | null;

  /** Low-stock threshold in base units (UC10, DEC-08). */
  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  /** Low-stock monitoring is switched per medicine, not by a zero level (DEC-08). */
  @Column({ default: true })
  lowStockMonitored: boolean;

  /** Batches expiring within this many days are reported and warned about (UC11, BR02). */
  @Column({ type: 'int', default: 90 })
  expiryAlertDays: number;

  /** A deactivated medicine cannot be received, dispensed or sold (FR-02). */
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
