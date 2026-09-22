import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity.js';
import { ReturnLine } from './return-line.entity.js';
import { User } from './user.entity.js';

/**
 * A customer return against an earlier sale (UC08).
 *
 * The original sale is never edited. The return is a separate document whose
 * lines post compensating stock movements (BR05), so the history of what was
 * sold stays readable.
 */
@Entity('sale_returns')
export class SaleReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNumber: string;

  @Column()
  reason: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  refundAmount: string;

  @ManyToOne(() => Sale, (sale) => sale.returns, { nullable: false })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @OneToMany(() => ReturnLine, (line) => line.saleReturn)
  lines: ReturnLine[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy: User;

  @CreateDateColumn()
  returnedAt: Date;
}
