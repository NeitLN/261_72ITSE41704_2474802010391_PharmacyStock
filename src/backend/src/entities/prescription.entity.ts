import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DispenseLine } from './dispense-line.entity.js';
import { PrescriptionItem } from './prescription-item.entity.js';
import { Customer } from './customer.entity.js';
import { Prescriber } from './prescriber.entity.js';

/**
 * Prescription status within the scope of this project.
 *
 * TODO (open decision 6.4-3): confirm which statuses make a prescription
 * "valid" for dispensing a controlled medicine under BR04.
 */
export enum PrescriptionStatus {
  RECEIVED = 'received',
  PARTIALLY_DISPENSED = 'partially_dispensed',
  DISPENSED = 'dispensed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * A prescription taken in at the counter (UC05).
 * This project uses simulated prescription data; the system does not verify
 * clinical appropriateness and is not a regulated medical device.
 */
@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNumber: string;

  @Column({ type: 'date' })
  issuedDate: string;

  /** A prescription cannot be dispensed after this date (BR10). */
  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.RECEIVED,
  })
  status: PrescriptionStatus;

  @ManyToOne(() => Customer, (customer) => customer.prescriptions, {
    nullable: false,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Prescriber, (prescriber) => prescriber.prescriptions, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescriber_id' })
  prescriber: Prescriber;

  @OneToMany(() => PrescriptionItem, (item) => item.prescription)
  items: PrescriptionItem[];

  @OneToMany(() => DispenseLine, (line) => line.prescription)
  dispenseLines: DispenseLine[];

  @CreateDateColumn()
  createdAt: Date;
}
