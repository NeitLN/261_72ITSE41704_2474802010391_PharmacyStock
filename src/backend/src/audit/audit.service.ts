import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, type EntityManager, type FindOptionsWhere } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { AuditLog } from '../entities/index.js';

/** The actions written to the audit log (FR-41). */
export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.role_changed'
  | 'user.locked'
  | 'user.unlocked'
  | 'user.password_reset'
  | 'role.permissions_changed'
  | 'stock_take.approved'
  | 'price.changed';

export interface AuditEntryView {
  id: string;
  occurredAt: Date;
  action: string;
  entityName: string;
  entityId: string | null;
  details: unknown;
  performedBy: { id: string; fullName: string } | null;
}

export interface AuditQuery {
  from?: string;
  to?: string;
  userId?: string;
  action?: string;
  page?: number;
}

const PAGE_SIZE = 50;

/**
 * The audit log of UC15 (FR-41). `record` is called with the entity manager
 * of the change it describes, so a change that rolls back leaves no entry.
 * Details are a small JSON object and never hold a password or its hash.
 */
@Injectable()
export class AuditService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async record(
    manager: EntityManager,
    performedBy: string | null,
    action: AuditAction,
    target: { entityName: string; entityId?: string | null },
    details?: Record<string, unknown>,
  ): Promise<void> {
    await manager.insert(AuditLog, {
      action,
      entityName: target.entityName,
      entityId: target.entityId ?? undefined,
      details: details ? JSON.stringify(details) : undefined,
      performedBy: performedBy ? { id: performedBy } : undefined,
    });
  }

  /** Newest first, 50 a page; filtered by period, user and action. */
  async list(
    actor: Actor,
    query: AuditQuery,
  ): Promise<{ items: AuditEntryView[]; total: number }> {
    assertPermission(actor, Permission.USER_MANAGE);
    const where: FindOptionsWhere<AuditLog> = {};
    if (query.from || query.to) {
      // Whole days in Asia/Ho_Chi_Minh, as the screen shows them.
      where.occurredAt = Between(
        new Date(`${query.from ?? '2000-01-01'}T00:00:00+07:00`),
        new Date(`${query.to ?? '2999-12-31'}T23:59:59.999+07:00`),
      );
    }
    if (query.userId) where.performedBy = { id: query.userId };
    if (query.action) where.action = query.action;
    const page = query.page ?? 1;
    const [rows, total] = await this.dataSource.getRepository(AuditLog).findAndCount({
      where,
      relations: { performedBy: true },
      order: { occurredAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt,
        action: r.action,
        entityName: r.entityName,
        entityId: r.entityId ?? null,
        details: r.details ? safeParse(r.details) : null,
        performedBy: r.performedBy
          ? { id: r.performedBy.id, fullName: r.performedBy.fullName }
          : null,
      })),
    };
  }
}

/** The seed's marker row and any older text are shown as they are. */
function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
