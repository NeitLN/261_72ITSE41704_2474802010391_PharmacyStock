import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity.js';
import { Prescription } from './prescription.entity.js';

/**
 * A walk-in or returning customer. Optional on a sale: an over-the-counter
 * purchase need not identify anyone, but a prescription dispensing does.
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  address: string;

  @OneToMany(() => Sale, (sale) => sale.customer)
  sales: Sale[];

  @OneToMany(() => Prescription, (prescription) => prescription.customer)
  prescriptions: Prescription[];

  @CreateDateColumn()
  createdAt: Date;
}
