import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { GoodsReceipt } from './goods-receipt.entity.js';
import { StockMovement } from './stock-movement.entity.js';

/**
 * A single delivered lot of one medicine, with its own expiry date.
 * FEFO dispensing (BR01) picks among batches by expiryDate ascending.
 *
 * TODO (open decision 6.4-1): confirm whether expiryDate is stored as a full
 * date or as year-month, and whether a batch expiring exactly on the
 * transaction date may still be dispensed.
 */
@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  batchNumber: string;

  @Column({ type: 'date' })
  expiryDate: string;

  /** Current quantity on hand. Must never go negative (BR03). */
  @Column({ type: 'int', default: 0 })
  quantityOnHand: number;

  @ManyToOne(() => Medicine, (medicine) => medicine.batches, {
    nullable: false,
  })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.batches, {
    nullable: true,
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt;

  @OneToMany(() => StockMovement, (movement) => movement.batch)
  movements: StockMovement[];
}
