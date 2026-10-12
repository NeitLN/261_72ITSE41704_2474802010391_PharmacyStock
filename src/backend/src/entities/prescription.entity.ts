import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { DispenseLine } from './dispense-line.entity.js';
import { PrescriptionItem } from './prescription-item.entity.js';
import { Customer } from './customer.entity.js';
import { Prescriber } from './prescriber.entity.js';
import { User } from './user.entity.js';

/**
 * Prescription status (FR-44, FR-22). Only a VERIFIED or PARTIALLY_DISPENSED
 * prescription can be dispensed; any edit returns it to RECEIVED. Being past
 * `validUntil` is not a status: it is checked at every visit (BR10).
 */
export enum PrescriptionStatus {
  RECEIVED = 'received',
  VERIFIED = 'verified',
  PARTIALLY_DISPENSED = 'partially_dispensed',
  FULLY_DISPENSED = 'fully_dispensed',
  CANCELLED = 'cancelled',
}

/**
 * A prescription taken in at the counter (UC05).
 * This project uses simulated prescription data; the system does not verify
 * clinical appropriateness and is not a regulated medical device.
 */
@Entity('prescriptions')
@Check('ck_prescriptions_valid_until', '"validUntil" >= "issuedDate"')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNumber: string;

  @Column({ type: 'date' })
  issuedDate: string;

  /** Issue date + the validity period in the settings (5 days); computed, never edited (BR10). */
  @Column({ type: 'date' })
  validUntil: string;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.RECEIVED,
  })
  status: PrescriptionStatus;

  /** Patient age in years when no date of birth is known (FR-13). */
  @Column({ type: 'int', nullable: true })
  patientAgeYears: number | null;

  /** For a child under 72 months: age in months, weight and the accompanying adult (FR-13). */
  @Column({ type: 'int', nullable: true })
  patientAgeMonths: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  patientWeightKg: string | null;

  @Column({ type: 'varchar', nullable: true })
  accompanyingAdult: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  verificationNote: string | null;

  @ManyToOne(() => Customer, (customer) => customer.prescriptions, {
    nullable: false,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Relation<Customer>;

  @ManyToOne(() => Prescriber, (prescriber) => prescriber.prescriptions, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescriber_id' })
  prescriber: Relation<Prescriber>;

  @OneToMany(() => PrescriptionItem, (item) => item.prescription)
  items: PrescriptionItem[];

  @OneToMany(() => DispenseLine, (line) => line.prescription)
  dispenseLines: DispenseLine[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
