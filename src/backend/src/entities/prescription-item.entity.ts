import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity.js';
import { Medicine } from './medicine.entity.js';
import { DispenseLine } from './dispense-line.entity.js';

/**
 * One prescribed medicine and the quantity the doctor ordered.
 *
 * This is what was *prescribed*; DispenseLine records what was *issued*, and
 * the two differ whenever a prescription is dispensed over several visits or
 * FEFO draws from more than one batch. Comparing them is what stops a
 * prescription being dispensed twice (BR07).
 */
@Entity('prescription_items')
export class PrescriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantityPrescribed: number;

  @Column({ nullable: true })
  dosageInstruction: string;

  @ManyToOne(() => Prescription, (prescription) => prescription.items, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @ManyToOne(() => Medicine, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @OneToMany(() => DispenseLine, (line) => line.prescriptionItem)
  dispenseLines: DispenseLine[];
}
