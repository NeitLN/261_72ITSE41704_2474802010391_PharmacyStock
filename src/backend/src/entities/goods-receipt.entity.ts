import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Supplier } from './supplier.entity.js';
import { GoodsReceiptLine } from './goods-receipt-line.entity.js';
import { User } from './user.entity.js';

/** A delivery of stock from a supplier (UC03). */
@Entity('goods_receipts')
@Unique('uq_goods_receipt_supplier_document', ['supplier', 'documentNumber'])
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The supplier's document number; a second receipt with it is refused (FR-08, TC-03). */
  @Column()
  documentNumber: string;

  @Column({ type: 'date' })
  receiptDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalCost: string;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.goodsReceipts, {
    nullable: false,
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Relation<Supplier>;

  @OneToMany(() => GoodsReceiptLine, (line) => line.goodsReceipt)
  lines: GoodsReceiptLine[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy: Relation<User>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
