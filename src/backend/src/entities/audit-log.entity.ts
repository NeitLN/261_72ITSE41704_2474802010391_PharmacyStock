import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from './user.entity.js';

/**
 * Append-only record of security-relevant actions: logins, permission changes,
 * stock adjustments, price changes and posted stock takes.
 *
 * StockMovement answers "what happened to stock"; this answers "who did
 * something the pharmacy may later be asked about".
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Dotted action name, e.g. `stock.adjust` or `user.role_changed`. */
  @Column()
  action: string;

  @Column()
  entityName: string;

  @Column({ nullable: true })
  entityId: string;

  /** Human-readable summary of what changed. */
  @Column({ type: 'text', nullable: true })
  details: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: Relation<User>;

  @CreateDateColumn()
  occurredAt: Date;
}
