import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Prescription } from './prescription.entity.js';

/**
 * The doctor named on a prescription. Held separately from the prescription so
 * a licence number can be checked once and reused, which is part of deciding
 * whether a prescription reference is valid under BR04.
 */
@Entity('prescribers')
export class Prescriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  licenceNumber: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  clinicName: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Prescription, (prescription) => prescription.prescriber)
  prescriptions: Prescription[];
}
