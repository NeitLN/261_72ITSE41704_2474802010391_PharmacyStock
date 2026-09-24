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
import { Medicine } from './medicine.entity.js';
import { GoodsReceipt } from './goods-receipt.entity.js';
import { StockMovement } from './stock-movement.entity.js';

export enum BatchStatus {
  /** Available for dispensing and sale. */
  AVAILABLE = 'available',
  /** Held aside — a return under review, or a recall. Not dispensable. */
  QUARANTINED = 'quarantined',
  /** Past its expiry date. Never dispensable (BR02). */
  EXPIRED = 'expired',
  /** Written off after a stock take or damage. */
  WRITTEN_OFF = 'written_off',
}

/**
 * A single delivered lot of one medicine, with its own expiry date.
 * FEFO dispensing (BR01) picks among AVAILABLE batches by expiryDate ascending.
 *
 * TODO (open decision 6.4-1): confirm whether expiryDate is stored as a full
 * date or as year-month, and whether a batch expiring exactly on the
 * transaction date may still be dispensed.
 */
@Entity('batches')
@Unique('uq_batch_medicine_number', ['medicine', 'batchNumber'])
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  batchNumber: string;

  @Column({ type: 'date' })
  expiryDate: string;

  /** Current quantity on hand, in the medicine's base unit. Never negative (BR03). */
  @Column({ type: 'int', default: 0 })
  quantityOnHand: number;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.AVAILABLE })
  status: BatchStatus;

  /** Purchase cost per base unit, used for turnover valuation (UC12). */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  unitCost: string;

  @ManyToOne(() => Medicine, (medicine) => medicine.batches, {
    nullable: false,
  })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.batches, {
    nullable: true,
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: Relation<GoodsReceipt>;

  @OneToMany(() => StockMovement, (movement) => movement.batch)
  movements: StockMovement[];

  @CreateDateColumn()
  createdAt: Date;
}
