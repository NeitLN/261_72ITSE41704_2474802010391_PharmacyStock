import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DispenseLine } from './dispense-line.entity.js';

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

  @Column()
  patientName: string;

  @Column({ nullable: true })
  prescriberName: string;

  @Column({ type: 'date' })
  issuedDate: string;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.RECEIVED,
  })
  status: PrescriptionStatus;

  @OneToMany(() => DispenseLine, (line) => line.prescription)
  dispenseLines: DispenseLine[];

  @CreateDateColumn()
  createdAt: Date;
}
