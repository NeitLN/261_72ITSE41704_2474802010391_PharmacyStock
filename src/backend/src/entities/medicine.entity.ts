import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Batch } from './batch.entity.js';

/**
 * A medicine in the pharmacy catalogue.
 * Stock is never held here directly: it lives on the individual batches,
 * because expiry tracking (BR01/BR02) is per batch.
 */
@Entity('medicines')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  activeIngredient: string;

  /** Standard stock unit for this medicine, e.g. tablet, bottle. */
  @Column()
  unit: string;

  /** Controlled medicines require a valid prescription reference (BR04). */
  @Column({ default: false })
  isControlled: boolean;

  /** Low-stock alert threshold (UC10). */
  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  @OneToMany(() => Batch, (batch) => batch.medicine)
  batches: Batch[];
}
