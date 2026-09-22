import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity.js';
import { PrescriptionItem } from './prescription-item.entity.js';
import { Batch } from './batch.entity.js';
import { Sale } from './sale.entity.js';
import { User } from './user.entity.js';

/**
 * One batch-level issue of a medicine against a prescription (UC06).
 * A single requested quantity can span several lines when FEFO (BR01) draws
 * from more than one batch, so each line records exactly which batch it came
 * from and how much was taken.
 */
@Entity('dispense_lines')
export class DispenseLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => Prescription, (prescription) => prescription.dispenseLines, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  /** Which prescribed item this fulfils, so over-dispensing is detectable (BR07). */
  @ManyToOne(() => PrescriptionItem, (item) => item.dispenseLines, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescription_item_id' })
  prescriptionItem: PrescriptionItem;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  /**
   * Set when this dispensing is also billed as a sale, so stock is not
   * deducted twice (TC-15).
   *
   * TODO (open decision 6.4-5): confirm how dispensing and sales are linked.
   */
  @ManyToOne(() => Sale, (sale) => sale.dispenseLines, { nullable: true })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'dispensed_by_id' })
  dispensedBy: User;

  @CreateDateColumn()
  dispensedAt: Date;
}
