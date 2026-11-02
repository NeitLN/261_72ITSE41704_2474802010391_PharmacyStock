import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { type Actor, assertPermission } from '../auth/actor.js';
import { hashPassword } from '../auth/passwords.js';
import { Permission, PERMISSION_DESCRIPTIONS } from '../auth/permissions.js';
import {
  BusinessRuleViolation,
  Conflict,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import { Permission as PermissionRow, Role, User } from '../entities/index.js';

export interface UserView {
  id: string;
  username: string;
  fullName: string;
  role: { code: string; name: string };
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface RoleView {
  code: string;
  name: string;
  permissions: string[];
  userCount: number;
}

export interface NewUser {
  username: string;
  fullName: string;
  roleCode: string;
  password: string;
  passwordConfirm: string;
}

export interface UserChange {
  fullName?: string;
  roleCode?: string;
  isActive?: boolean;
}

const LAST_MANAGER =
  'At least one active user must keep the right to manage users, or nobody could manage them.';

/**
 * UC15 users, roles and permissions (FR-40). Every change is checked against
 * the rule that one active user with `user.manage` always remains, and is
 * written to the audit log in the same transaction (FR-41). The guard reads
 * the user, role and permissions on every request (UC16), so a change applies
 * at once.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor): Promise<UserView[]> {
    assertPermission(actor, Permission.USER_MANAGE);
    const users = await this.dataSource.getRepository(User).find({
      relations: { role: true },
      order: { username: 'ASC' },
    });
    return users.map(view);
  }

  async create(actor: Actor, input: NewUser): Promise<UserView> {
    assertPermission(actor, Permission.USER_MANAGE);
    samePassword(input.password, input.passwordConfirm);
    const passwordHash = await hashPassword(input.password);
    const id = await this.dataSource.transaction(async (manager) => {
      const role = await roleByCode(manager, input.roleCode);
      const taken = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('LOWER(u.username) = LOWER(:username)', { username: input.username })
        .getExists();
      if (taken) {
        throw new Conflict(
          'USERNAME_TAKEN',
          `The username ${input.username} is already taken.`,
          'username',
        );
      }
      const user = await manager.save(
        manager.create(User, {
          username: input.username,
          fullName: input.fullName.trim(),
          role,
          passwordHash,
          isActive: true,
        }),
      );
      await this.audit.record(
        manager,
        actor.id,
        'user.created',
        { entityName: 'User', entityId: user.id },
        { username: user.username, role: role.code },
      );
      return user.id;
    });
    return this.get(id);
  }

  async update(actor: Actor, id: string, change: UserChange): Promise<UserView> {
    assertPermission(actor, Permission.USER_MANAGE);
    await this.dataSource.transaction(async (manager) => {
      await lockUserManagers(manager);
      const user = await manager.findOne(User, { where: { id }, relations: { role: true } });
      if (!user) throw new NotFound('User', id);
      const role = change.roleCode ? await roleByCode(manager, change.roleCode) : user.role;
      const isActive = change.isActive ?? user.isActive;
      await assertManagerRemains(manager, { userId: id, isActive, roleId: role.id });

      const fullName = change.fullName?.trim();
      if (fullName && fullName !== user.fullName) {
        await manager.update(User, id, { fullName });
        await this.audit.record(manager, actor.id, 'user.updated', target(id), {
          fullName: { from: user.fullName, to: fullName },
        });
      }
      if (role.id !== user.role.id) {
        await manager.update(User, id, { role: { id: role.id } });
        await this.audit.record(manager, actor.id, 'user.role_changed', target(id), {
          from: user.role.code,
          to: role.code,
        });
      }
      if (isActive !== user.isActive) {
        await manager.update(User, id, { isActive });
        await this.audit.record(
          manager,
          actor.id,
          isActive ? 'user.unlocked' : 'user.locked',
          target(id),
          { username: user.username },
        );
      }
    });
    return this.get(id);
  }

  async resetPassword(
    actor: Actor,
    id: string,
    password: string,
    passwordConfirm: string,
  ): Promise<void> {
    assertPermission(actor, Permission.USER_MANAGE);
    samePassword(password, passwordConfirm);
    const passwordHash = await hashPassword(password);
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { id });
      if (!user) throw new NotFound('User', id);
      await manager.update(User, id, { passwordHash });
      await this.audit.record(manager, actor.id, 'user.password_reset', target(id), {
        username: user.username,
      });
    });
  }

  async roles(actor: Actor): Promise<{
    roles: RoleView[];
    allPermissions: Array<{ code: string; description: string }>;
  }> {
    assertPermission(actor, Permission.USER_MANAGE);
    const roles = await this.dataSource.getRepository(Role).find({
      relations: { permissions: true, users: true },
      order: { code: 'ASC' },
    });
    return {
      roles: roles.map(roleView),
      allPermissions: Object.values(Permission).map((code) => ({
        code,
        description: PERMISSION_DESCRIPTIONS[code],
      })),
    };
  }

  async setRolePermissions(
    actor: Actor,
    roleCode: string,
    codes: string[],
  ): Promise<RoleView> {
    assertPermission(actor, Permission.USER_MANAGE);
    const wanted = [...new Set(codes)];
    const known = new Set<string>(Object.values(Permission));
    const unknown = wanted.findIndex((c) => !known.has(c));
    if (unknown >= 0) {
      throw ValidationFailed.field(
        `permissions.${codes.indexOf(wanted[unknown])}`,
        `${wanted[unknown]} is not a permission.`,
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await lockUserManagers(manager);
      const role = await manager.findOne(Role, {
        where: { code: roleCode },
        relations: { permissions: true },
      });
      if (!role) throw new NotFound('Role', roleCode);
      const before = role.permissions.map((p) => p.code).sort();
      const after = [...wanted].sort();
      if (!after.includes(Permission.USER_MANAGE)) {
        await assertManagerRemains(manager, { roleWithoutUserManage: role.id });
      }
      role.permissions = await manager.findBy(PermissionRow, { code: In(after) });
      await manager.save(role);
      await this.audit.record(
        manager,
        actor.id,
        'role.permissions_changed',
        { entityName: 'Role', entityId: role.id },
        {
          role: role.code,
          added: after.filter((c) => !before.includes(c)),
          removed: before.filter((c) => !after.includes(c)),
        },
      );
    });
    const role = await this.dataSource.getRepository(Role).findOneOrFail({
      where: { code: roleCode },
      relations: { permissions: true, users: true },
    });
    return roleView(role);
  }

  private async get(id: string): Promise<UserView> {
    return view(
      await this.dataSource
        .getRepository(User)
        .findOneOrFail({ where: { id }, relations: { role: true } }),
    );
  }
}

const target = (id: string) => ({ entityName: 'User', entityId: id });

function view(u: User): UserView {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: { code: u.role.code, name: u.role.name },
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

function roleView(r: Role): RoleView {
  return {
    code: r.code,
    name: r.name,
    permissions: r.permissions.map((p) => p.code).sort(),
    userCount: r.users.length,
  };
}

function samePassword(password: string, confirm: string): void {
  if (password !== confirm) {
    throw ValidationFailed.field('passwordConfirm', 'The two passwords differ.');
  }
}

async function roleByCode(manager: EntityManager, code: string): Promise<Role> {
  const role = await manager.findOneBy(Role, { code });
  if (!role) throw ValidationFailed.field('roleCode', `${code} is not a role.`);
  return role;
}

/**
 * Locks every active user who may manage users, so two changes that would
 * each leave the other as the last one cannot both commit.
 */
async function lockUserManagers(manager: EntityManager): Promise<void> {
  await manager.query(
    `SELECT u.id FROM users u
     WHERE u."isActive" AND u.role_id IN (
       SELECT rp."rolesId" FROM role_permissions rp
       JOIN permissions p ON p.id = rp."permissionsId"
       WHERE p.code = $1)
     ORDER BY u.id
     FOR UPDATE OF u`,
    [Permission.USER_MANAGE],
  );
}

/**
 * Refuses a change after which no active user could manage users: a lock, a
 * role change (`userId` with its new state) or removing the permission from
 * a role (`roleWithoutUserManage`).
 */
async function assertManagerRemains(
  manager: EntityManager,
  change:
    | { userId: string; isActive: boolean; roleId: string }
    | { roleWithoutUserManage: string },
): Promise<void> {
  const rows = await manager.query<Array<{ id: string; role_id: string }>>(
    `SELECT u.id, u.role_id FROM users u
     WHERE u."isActive" AND u.role_id IN (
       SELECT rp."rolesId" FROM role_permissions rp
       JOIN permissions p ON p.id = rp."permissionsId"
       WHERE p.code = $1)`,
    [Permission.USER_MANAGE],
  );
  let remaining = rows.filter((r) =>
    'roleWithoutUserManage' in change ? r.role_id !== change.roleWithoutUserManage : r.id !== change.userId,
  ).length;
  if ('userId' in change && change.isActive) {
    const [{ can }] = await manager.query<Array<{ can: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp."permissionsId"
         WHERE rp."rolesId" = $1 AND p.code = $2) AS can`,
      [change.roleId, Permission.USER_MANAGE],
    );
    if (can) remaining += 1;
  }
  if (remaining === 0) {
    throw new BusinessRuleViolation('UC15', 'LAST_USER_MANAGER', LAST_MANAGER);
  }
}
