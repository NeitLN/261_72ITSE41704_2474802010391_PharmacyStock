import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Medicine } from './medicine.entity.js';

/**
 * A dispensing unit such as tablet, blister or box.
 *
 * `conversionToBase` says how many base units one of these contains, so a box
 * of 10 blisters of 10 tablets resolves to 100 tablets. Stock is always held
 * in base units; conversion happens at the boundary (BR06).
 */
@Entity('units_of_measure')
export class UnitOfMeasure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 1 })
  conversionToBase: number;

  @Column({ default: false })
  isBaseUnit: boolean;

  @OneToMany(() => Medicine, (medicine) => medicine.baseUnit)
  medicines: Medicine[];
}
