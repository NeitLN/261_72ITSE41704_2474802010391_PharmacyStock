import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { SaleLine } from './sale-line.entity.js';
import { SaleReturn } from './sale-return.entity.js';
import { DispenseLine } from './dispense-line.entity.js';
import { Customer } from './customer.entity.js';
import { User } from './user.entity.js';

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

  /** Optional: an over-the-counter sale need not identify the buyer. */
  @ManyToOne(() => Customer, (customer) => customer.sales, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Relation<Customer>;

  @OneToMany(() => SaleLine, (line) => line.sale)
  lines: SaleLine[];

  @OneToMany(() => SaleReturn, (saleReturn) => saleReturn.sale)
  returns: SaleReturn[];

  @OneToMany(() => DispenseLine, (line) => line.sale)
  dispenseLines: DispenseLine[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'sold_by_id' })
  soldBy: Relation<User>;

  @CreateDateColumn()
  soldAt: Date;
}
