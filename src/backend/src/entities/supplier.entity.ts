import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity.js';

/** A supplier the pharmacy buys stock from (UC02, FR-05). */
@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  /** A deactivated supplier cannot be chosen on a new goods receipt. */
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => GoodsReceipt, (receipt) => receipt.supplier)
  goodsReceipts: GoodsReceipt[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
