import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Batch } from './batch.entity.js';
import { StockMovement } from './stock-movement.entity.js';
import { User } from './user.entity.js';

export enum DestructionMethod {
  /** Sent back to the supplier, who destroys it. */
  SUPPLIER_RETURN = 'supplier_return',
  /** Collected by a licensed waste contractor. */
  LICENSED_CONTRACTOR = 'licensed_contractor',
  /** Anything else; `methodNote` says what. */
  OTHER = 'other',
}

/**
 * The record that stock pending destruction was actually destroyed (FR-47,
 * DEC-04): when, how and who witnessed it. Each record posted exactly one
 * DESTROY movement, so *destroyed* always has a document behind it.
 */
@Entity('destruction_records')
@Check('ck_destruction_records_quantity', '"quantity" > 0')
export class DestructionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Batch, { nullable: false })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch>;

  @Column({ type: 'int' })
  quantity: number;

  /** The day it was destroyed; not after the business date. */
  @Column({ type: 'date' })
  destroyedOn: string;

  @Column({ type: 'enum', enum: DestructionMethod })
  method: DestructionMethod;

  /** Required when the method is OTHER. */
  @Column({ type: 'varchar', nullable: true })
  methodNote: string | null;

  /** Who saw it destroyed, by name. */
  @Column({ type: 'varchar' })
  witness: string;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @OneToOne(() => StockMovement, { nullable: false })
  @JoinColumn({ name: 'movement_id' })
  movement: Relation<StockMovement>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'recorded_by_id' })
  recordedBy: Relation<User>;

  @CreateDateColumn({ type: 'timestamptz' })
  recordedAt: Date;
}
