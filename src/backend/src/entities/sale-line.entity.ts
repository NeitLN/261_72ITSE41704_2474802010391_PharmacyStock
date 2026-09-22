import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity.js';
import { Batch } from './batch.entity.js';
import { ReturnLine } from './return-line.entity.js';

/**
 * One priced line on a sale, drawn from a specific batch.
 *
 * Price is copied onto the line rather than read from the medicine, so a later
 * price change does not rewrite the value of past sales.
 */
@Entity('sale_lines')
export class SaleLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  lineTotal: string;

  @ManyToOne(() => Sale, (sale) => sale.lines, { nullable: false })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @OneToMany(() => ReturnLine, (line) => line.saleLine)
  returnLines: ReturnLine[];
}
