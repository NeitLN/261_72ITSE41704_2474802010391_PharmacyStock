import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Medicine } from './medicine.entity.js';

/** Therapeutic grouping used for catalogue browsing and turnover reports. */
@Entity('medicine_categories')
export class MedicineCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Medicine, (medicine) => medicine.category)
  medicines: Medicine[];
}
