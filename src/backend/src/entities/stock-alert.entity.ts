import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { Batch } from './batch.entity.js';
import { User } from './user.entity.js';

export enum AlertType {
  LOW_STOCK = 'low_stock',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
}

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  /** The underlying condition no longer holds. */
  RESOLVED = 'resolved',
}

/**
 * A raised stock alert (UC10, UC11).
 *
 * Alerts are stored rather than computed on every page load so that the team
 * can show who saw an alert and when it was acted on — the evidence the
 * pharmacy needs when expired stock is found at the counter.
 */
@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.OPEN })
  status: AlertStatus;

  @Column()
  message: string;

  @ManyToOne(() => Medicine, { nullable: false })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Relation<Medicine>;

  /** Null for a low-stock alert, which is about the medicine as a whole. */
  @ManyToOne(() => Batch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch>;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledgedBy: Relation<User>;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @CreateDateColumn()
  raisedAt: Date;
}
