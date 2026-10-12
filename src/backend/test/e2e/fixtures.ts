import type { DataSource } from 'typeorm';
import type { Actor } from '../../src/auth/actor.js';
import { ROLE_PERMISSIONS, RoleCode } from '../../src/auth/permissions.js';
import {
  Medicine,
  MedicineCategory,
  MedicineClassification,
  UnitOfMeasure,
  User,
} from '../../src/entities/index.js';

/** The seeded sample user as an Actor, for calling services directly. */
export async function actorFor(
  dataSource: DataSource,
  username: 'manager' | 'pharmacist' | 'cashier',
): Promise<Actor> {
  const user = await dataSource
    .getRepository(User)
    .findOneOrFail({ where: { username }, relations: { role: true } });
  const role = user.role.code as RoleCode;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role,
    permissions: new Set(ROLE_PERMISSIONS[role]),
  };
}

let counter = 0;

/** A medicine with its own category and unit, for tests that need stock. */
export async function createMedicine(
  dataSource: DataSource,
  overrides: Partial<Medicine> = {},
): Promise<Medicine> {
  counter += 1;
  const category = await dataSource
    .getRepository(MedicineCategory)
    .save({ code: `TCAT${counter}`, name: `Test category ${counter}` });
  const unit = await dataSource
    .getRepository(UnitOfMeasure)
    .save({ code: `TU${counter}`, name: 'Tablet', isBaseUnit: true });
  return dataSource.getRepository(Medicine).save({
    code: `TMED${counter}`,
    name: `Test medicine ${counter}`,
    classification: MedicineClassification.OTC,
    category,
    baseUnit: unit,
    ...overrides,
  });
}
