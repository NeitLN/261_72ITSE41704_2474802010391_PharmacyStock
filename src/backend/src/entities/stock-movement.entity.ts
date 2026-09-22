import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Batch } from './batch.entity.js';
import { User } from './user.entity.js';

export enum MovementType {
  RECEIPT = 'receipt',
  DISPENSE = 'dispense',
  SALE = 'sale',
  RETURN = 'return',
  /** Posted from a stock take discrepancy. */
  ADJUSTMENT = 'adjustment',
  /** Expired or damaged stock removed from circulation. */
  WRITE_OFF = 'write_off',
}

/**
 * An append-only record of every change to batch stock (BR05).
 * Corrections are made by posting a compensating movement, never by editing
 * or deleting an existing row, so the audit trail stays intact.
 */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  /** Positive increases stock, negative decreases it. */
  @Column({ type: 'int' })
  quantityDelta: number;

  /** Required for adjustments (TC-20). */
  @Column({ nullable: true })
  reason: string;

  /** Id of the receipt, dispense line, sale or return that caused this. */
  @Column({ nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => Batch, (batch) => batch.movements, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User;

  @CreateDateColumn()
  occurredAt: Date;
}
