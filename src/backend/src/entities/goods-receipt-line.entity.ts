import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity.js';
import { Medicine } from './medicine.entity.js';
import { Batch } from './batch.entity.js';

/**
 * One delivered line on a goods receipt: which medicine, how many, at what
 * cost, and the batch it created.
 *
 * Cost is recorded per line because the same medicine bought at two prices
 * must value its batches separately in the turnover report (UC12).
 */
@Entity('goods_receipt_lines')
export class GoodsReceiptLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantityReceived: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitCost: string;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.lines, {
    nullable: false,
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt;

  @ManyToOne(() => Medicine, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  /** The batch this line brought into stock. */
  @OneToOne(() => Batch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;
}
