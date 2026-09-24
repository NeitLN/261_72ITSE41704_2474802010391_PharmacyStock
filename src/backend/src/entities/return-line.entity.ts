import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { SaleReturn } from './sale-return.entity.js';
import { SaleLine } from './sale-line.entity.js';

/**
 * How a returned item re-enters stock.
 *
 * TODO (open decision 6.4-4): confirm which of these a returned medicine may
 * take, and whether RESTOCKED items may be dispensed again.
 */
export enum ReturnDisposition {
  /** Returned to saleable stock on its original batch. */
  RESTOCKED = 'restocked',
  /** Held aside, not available for dispensing. */
  QUARANTINED = 'quarantined',
  /** Written off and removed from stock entirely. */
  DESTROYED = 'destroyed',
}

/** One returned line, tied to the sale line it reverses. */
@Entity('return_lines')
export class ReturnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'enum', enum: ReturnDisposition })
  disposition: ReturnDisposition;

  @ManyToOne(() => SaleReturn, (saleReturn) => saleReturn.lines, {
    nullable: false,
  })
  @JoinColumn({ name: 'sale_return_id' })
  saleReturn: Relation<SaleReturn>;

  /** Caps the returnable quantity: you cannot return more than was sold (TC-17). */
  @ManyToOne(() => SaleLine, (line) => line.returnLines, { nullable: false })
  @JoinColumn({ name: 'sale_line_id' })
  saleLine: Relation<SaleLine>;
}
