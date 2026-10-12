import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
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
@Check('ck_dispense_lines_quantity', '"quantity" > 0')
export class DispenseLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => Prescription, (prescription) => prescription.dispenseLines, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Relation<Prescription>;

  /** Which prescribed item this fulfils, so over-dispensing is detectable (BR07). */
  @ManyToOne(() => PrescriptionItem, (item) => item.dispenseLines, {
    nullable: false,
  })
  @JoinColumn({ name: 'prescription_item_id' })
  prescriptionItem: Relation<PrescriptionItem>;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch>;

  /**
   * Set when this dispensing is billed as a sale. Billing creates sale lines
   * without a second stock movement (DEC-05, FR-26).
   */
  @ManyToOne(() => Sale, (sale) => sale.dispenseLines, { nullable: true })
  @JoinColumn({ name: 'sale_id' })
  sale: Relation<Sale>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'dispensed_by_id' })
  dispensedBy: Relation<User>;

  /** Why less than requested was supplied, confirmed by the pharmacist (DEC-02). */
  @Column({ type: 'varchar', nullable: true })
  partialSupplyNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dispensedAt: Date;
}
