import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { DataSource, EntityManager } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import type { Permission } from '../auth/permissions.js';
import { ValidationFailed } from '../common/errors.js';
import { toFieldErrors } from '../common/validation.js';
import type { Clock } from '../stock/clock.js';

/** What every report answers with, whatever its kind (decision D14). */
export interface ReportResult<Q, R, T> {
  kind: string;
  query: Q;
  producedAt: Date;
  producedBy: { id: string; fullName: string };
  rows: R[];
  totals: T;
}

/**
 * One report (UC10–UC12, decision D14). `generate()` is the template: check
 * the permission, validate the query, read the rows, add the totals, stamp
 * who and when. A kind supplies only what differs: its permission, its query
 * class, its rows and its totals. Every report is read only.
 */
export abstract class ReportGenerator<Q extends object, R, T> {
  abstract readonly kind: string;
  protected abstract readonly permission: Permission;
  /** The query class, validated like a request body (400 per field). */
  protected abstract readonly queryType: new () => Q;

  constructor(
    protected readonly dataSource: DataSource,
    protected readonly clock: Clock,
  ) {}

  async generate(
    actor: Actor,
    raw: Record<string, unknown>,
  ): Promise<ReportResult<Q, R, T>> {
    assertPermission(actor, this.permission);
    const query = await this.parse(raw);
    this.check(query);
    const rows = await this.rows(this.dataSource.manager, query);
    return {
      kind: this.kind,
      query,
      producedAt: this.clock.now(),
      producedBy: { id: actor.id, fullName: actor.fullName },
      rows,
      totals: this.totals(rows),
    };
  }

  /** Rules across fields, after each field is valid; throw ValidationFailed. */
  protected check(_query: Q): void {}

  protected abstract rows(manager: EntityManager, query: Q): Promise<R[]>;

  protected abstract totals(rows: R[]): T;

  protected async parse(raw: Record<string, unknown>): Promise<Q> {
    const query = plainToInstance(this.queryType, raw);
    const errors = await validate(query, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) throw new ValidationFailed(toFieldErrors(errors));
    return query;
  }
}

/** Decimal strings ("1500.00") added as whole cents, never as floats. */
export function addMoney(values: string[]): string {
  const cents = values.reduce((sum, v) => sum + toCents(v), 0n);
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
}

export function toCents(amount: string): bigint {
  const negative = amount.startsWith('-');
  const [whole, fraction = ''] = amount.replace('-', '').split('.');
  const cents = BigInt(whole || '0') * 100n + BigInt((fraction + '00').slice(0, 2));
  return negative ? -cents : cents;
}
