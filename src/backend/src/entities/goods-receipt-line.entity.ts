import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity.js';
import { Medicine } from './medicine.entity.js';
import { Batch } from './batch.entity.js';

/**
 * One delivered line on a goods receipt: which medicine, how many, at what
 * cost, and the batch it created or topped up.
 *
 * Several lines over time can top up the same batch when the same batch number
 * arrives again with the same expiry date, so the batch link is many-to-one.
 */
@Entity('goods_receipt_lines')
@Check('ck_goods_receipt_lines_quantity', '"quantity" > 0')
@Check('ck_goods_receipt_lines_unit_cost', '"unitCost" >= 0')
export class GoodsReceiptLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  lineNumber: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitCost: string;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.lines, {
    nullable: false,
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: Relation<GoodsReceipt>;

  @ManyToOne(() => Medicine, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch>;
}
