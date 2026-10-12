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
 *
 * Safe to run again without undoing changes made in the application (UC15):
 * a role that already exists keeps its grants and only receives permissions
 * that are new in this run; a sample account that already exists keeps its
 * role and name.
 */
export async function seedAccessControl(manager: EntityManager): Promise<void> {
  const existingCodes = new Set(
    (await manager.find(Permission, { select: { code: true } })).map(
      (p) => p.code,
    ),
  );
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
    const existing = await manager.findOne(Role, {
      where: { code },
      relations: { permissions: true },
    });
    if (!existing) {
      await manager.save(
        manager.create(Role, {
          code,
          name: ROLE_NAMES[code],
          permissions: ROLE_PERMISSIONS[code].map((p) => byCode.get(p)!),
        }),
      );
      continue;
    }
    const added = ROLE_PERMISSIONS[code].filter((p) => !existingCodes.has(p));
    if (added.length > 0) {
      existing.permissions.push(...added.map((p) => byCode.get(p)!));
      await manager.save(existing);
    }
  }

  for (const sample of SAMPLE_USERS) {
    if (await manager.existsBy(User, { username: sample.username })) continue;
    const role = await manager.findOneByOrFail(Role, { code: sample.role });
    await manager.save(
      manager.create(User, {
        username: sample.username,
        passwordHash: NO_PASSWORD,
        fullName: sample.fullName,
        role,
      }),
    );
  }
}
