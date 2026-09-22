import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DispenseLine } from './dispense-line.entity.js';

export enum SaleStatus {
  COMPLETED = 'completed',
  PARTIALLY_RETURNED = 'partially_returned',
  RETURNED = 'returned',
}

/** An over-the-counter or prescription sale (UC07). */
@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  receiptNumber: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @OneToMany(() => DispenseLine, (line) => line.sale)
  dispenseLines: DispenseLine[];

  @CreateDateColumn()
  soldAt: Date;
}
