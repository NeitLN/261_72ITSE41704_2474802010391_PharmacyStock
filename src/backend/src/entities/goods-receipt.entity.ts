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
import { Supplier } from './supplier.entity.js';
import { Batch } from './batch.entity.js';
import { GoodsReceiptLine } from './goods-receipt-line.entity.js';
import { User } from './user.entity.js';

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

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalCost: string;

  @Column({ nullable: true })
  note: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.goodsReceipts, {
    nullable: false,
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Relation<Supplier>;

  @OneToMany(() => GoodsReceiptLine, (line) => line.goodsReceipt)
  lines: GoodsReceiptLine[];

  @OneToMany(() => Batch, (batch) => batch.goodsReceipt)
  batches: Batch[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;
}
