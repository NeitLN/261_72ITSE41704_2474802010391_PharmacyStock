import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity.js';

/** A supplier the pharmacy buys stock from (UC02). */
@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => GoodsReceipt, (receipt) => receipt.supplier)
  goodsReceipts: GoodsReceipt[];
}
