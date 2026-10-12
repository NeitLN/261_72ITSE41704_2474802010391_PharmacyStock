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
import { Prescription } from './prescription.entity.js';
import { Medicine } from './medicine.entity.js';
import { DispenseLine } from './dispense-line.entity.js';

/**
 * One prescribed medicine and the quantity the doctor ordered.
 *
 * This is what was *prescribed*; DispenseLine records what was *issued*, and
 * the two differ whenever a prescription is dispensed over several visits or
 * FEFO draws from more than one batch. `quantityDispensed` caches the sum of
 * the dispense lines, and a CHECK keeps it within the prescribed quantity
 * (BR07) as a safety net behind the service check.
 */
@Entity('prescription_items')
@Check('ck_prescription_items_quantity', '"quantityPrescribed" > 0')
@Check(
  'ck_prescription_items_dispensed',
  '"quantityDispensed" >= 0 AND "quantityDispensed" <= "quantityPrescribed"',
)
export class PrescriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantityPrescribed: number;

  @Column({ type: 'int', default: 0 })
  quantityDispensed: number;

  /** Strength as written on the prescription, e.g. "500 mg" (DEC-03). */
  @Column()
  strength: string;

  @Column()
  dose: string;

  @Column()
  route: string;

  @Column({ type: 'int' })
  daysOfUse: number;

  @ManyToOne(() => Prescription, (prescription) => prescription.items, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Relation<Prescription>;

  @ManyToOne(() => Medicine, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  @OneToMany(() => DispenseLine, (line) => line.prescriptionItem)
  dispenseLines: DispenseLine[];
}
