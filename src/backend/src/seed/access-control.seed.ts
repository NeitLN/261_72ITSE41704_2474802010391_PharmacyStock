import type { EntityManager } from 'typeorm';
import {
  PERMISSION_DESCRIPTIONS,
  Permission as PermissionCode,
  ROLE_PERMISSIONS,
  RoleCode,
} from '../auth/permissions.js';
import { Permission, Role, User } from '../entities/index.js';

const ROLE_NAMES: Record<RoleCode, string> = {
  [RoleCode.MANAGER]: 'Manager',
  [RoleCode.PHARMACIST]: 'Pharmacist',
  [RoleCode.CASHIER]: 'Cashier',
};

/** One sample account per role. Usernames are what the dev user switcher sends. */
export const SAMPLE_USERS: {
  username: string;
  fullName: string;
  role: RoleCode;
}[] = [
  { username: 'manager', fullName: 'Sample Manager', role: RoleCode.MANAGER },
  {
    username: 'pharmacist',
    fullName: 'Sample Pharmacist',
    role: RoleCode.PHARMACIST,
  },
  { username: 'cashier', fullName: 'Sample Cashier', role: RoleCode.CASHIER },
];

/**
 * Not a valid bcrypt hash, so nobody can sign in with a password yet. UC16
 * (issue #43) replaces it with real hashes when sign-in is built.
 */
const NO_PASSWORD = '!';

/**
 * Writes the permission matrix (Proposal Table 2.4) and the sample accounts.
 * Safe to run again: existing rows are updated, not duplicated.
 */
export async function seedAccessControl(manager: EntityManager): Promise<void> {
  await manager.upsert(
    Permission,
    Object.values(PermissionCode).map((code) => ({
      code,
      description: PERMISSION_DESCRIPTIONS[code],
    })),
    ['code'],
  );
  const permissions = await manager.find(Permission);
  const byCode = new Map(permissions.map((p) => [p.code, p]));

  for (const code of Object.values(RoleCode)) {
    const role =
      (await manager.findOne(Role, { where: { code } })) ??
      manager.create(Role, { code });
    role.name = ROLE_NAMES[code];
    role.permissions = ROLE_PERMISSIONS[code].map((p) => byCode.get(p)!);
    await manager.save(role);
  }

  for (const sample of SAMPLE_USERS) {
    const role = await manager.findOneByOrFail(Role, { code: sample.role });
    const user =
      (await manager.findOne(User, { where: { username: sample.username } })) ??
      manager.create(User, {
        username: sample.username,
        passwordHash: NO_PASSWORD,
      });
    user.fullName = sample.fullName;
    user.role = role;
    await manager.save(user);
  }
}
