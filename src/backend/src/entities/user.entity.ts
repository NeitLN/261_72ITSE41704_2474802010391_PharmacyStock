import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** The two roles required by the course scope (minimum 2 roles). */
export enum UserRole {
  /** Full access: catalogue, suppliers, receipts, adjustments, reports. */
  MANAGER = 'manager',
  /** Counter staff: prescription intake, dispensing, sales, returns. */
  PHARMACIST = 'pharmacist',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  /** Stores a hash, never a plaintext password. */
  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;
}
