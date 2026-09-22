import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity.js';
import { Batch } from './batch.entity.js';

/** A delivery of stock from a supplier (UC03). */
@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Supplier document number, used to reject duplicate entry (TC-03). */
  @Column({ unique: true })
  referenceNumber: string;

  @Column({ type: 'date' })
  receivedDate: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.goodsReceipts, {
    nullable: false,
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => Batch, (batch) => batch.goodsReceipt)
  batches: Batch[];

  @CreateDateColumn()
  createdAt: Date;
}
