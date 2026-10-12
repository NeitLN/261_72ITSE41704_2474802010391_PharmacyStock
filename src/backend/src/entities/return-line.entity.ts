import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { SaleReturn } from './sale-return.entity.js';
import { SaleLine } from './sale-line.entity.js';
import { User } from './user.entity.js';

/**
 * Where a returned item stands (BR11, DEC-04). A return always enters the
 * quarantine of its original batch as PENDING_ASSESSMENT; a manager then
 * releases it to sellable stock or rejects it to pending destruction (FR-46).
 */
export enum ReturnAssessmentStatus {
  PENDING_ASSESSMENT = 'pending_assessment',
  RELEASED = 'released',
  REJECTED = 'rejected',
}

/** One returned line, tied to the sale line it reverses. */
@Entity('return_lines')
@Check('ck_return_lines_quantity', '"quantity" > 0')
export class ReturnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  /** Copied from the sale line: the refund uses the original unit price (FR-28). */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({
    type: 'enum',
    enum: ReturnAssessmentStatus,
    default: ReturnAssessmentStatus.PENDING_ASSESSMENT,
  })
  assessmentStatus: ReturnAssessmentStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assessed_by_id' })
  assessedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  assessedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  assessmentNote: string | null;

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
