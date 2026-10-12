import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Medicine } from './medicine.entity.js';
import { Batch } from './batch.entity.js';
import { User } from './user.entity.js';

export enum AlertType {
  /** Sellable quantity above zero and at or below the reorder level (DEC-08). */
  LOW_STOCK = 'low_stock',
  /** Sellable quantity is zero (DEC-08). */
  OUT_OF_STOCK = 'out_of_stock',
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
 * can show who saw an alert and when it was acted on. At most one unresolved
 * stock-level alert exists per medicine, and at most one unresolved expiry
 * alert per batch (partial unique indexes, decision 16).
 */
@Entity('stock_alerts')
@Check(
  'ck_stock_alerts_batch_by_type',
  `("type" IN ('expiring_soon', 'expired') AND "batch_id" IS NOT NULL) OR ("type" IN ('low_stock', 'out_of_stock') AND "batch_id" IS NULL)`,
)
@Index('uq_stock_alerts_open_level', ['medicine'], {
  unique: true,
  where: `"type" IN ('low_stock', 'out_of_stock') AND "status" <> 'resolved'`,
})
@Index('uq_stock_alerts_open_expiry', ['batch'], {
  unique: true,
  where: `"type" IN ('expiring_soon', 'expired') AND "status" <> 'resolved'`,
})
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

  /** Required for an expiry alert; null for a stock-level alert, which is about the medicine as a whole. */
  @ManyToOne(() => Batch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Relation<Batch> | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledgedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  raisedAt: Date;
}
