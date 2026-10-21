import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Not } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { Conflict, NotFound } from '../common/errors.js';
import {
  AlertStatus,
  AlertType,
  Medicine,
  StockAlert,
} from '../entities/index.js';
import { AlertEvaluator } from '../stock/alert-evaluator.js';
import { Clock } from '../stock/clock.js';
import { StockLedger } from '../stock/stock-ledger.js';
import type { ListAlertsQuery } from './dto/alerts.dto.js';

export interface AlertView {
  id: string;
  type: AlertType;
  status: AlertStatus;
  message: string;
  medicine: { id: string; code: string; name: string; reorderLevel: number };
  /** Sellable quantity now, by the same rule as issuing (DEC-08). */
  sellable: number;
  raisedAt: Date;
  acknowledgedBy: { id: string; fullName: string } | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

const LEVEL_TYPES = [AlertType.LOW_STOCK, AlertType.OUT_OF_STOCK];

/**
 * UC10 Review low-stock alerts (FR-33, FR-34).
 *
 * Alerts are raised and resolved by `AlertEvaluator` as stock moves. Expiry
 * makes stock unsellable at midnight without any movement, so every medicine
 * is evaluated again when the API starts and on the first alert request of a
 * new business date (UC10 decisions).
 */
@Injectable()
export class AlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AlertsService.name);
  /** Business date of the last full evaluation. */
  private evaluatedOn: string | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ledger: StockLedger,
    private readonly evaluator: AlertEvaluator,
    private readonly clock: Clock,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.evaluateAll();
    } catch (error) {
      // Not fatal: the first alert request of the day tries again.
      this.evaluatedOn = null;
      this.logger.warn(`Start-up alert evaluation failed: ${String(error)}`);
    }
  }

  async list(actor: Actor, query: ListAlertsQuery): Promise<AlertView[]> {
    assertPermission(actor, Permission.ALERT_MANAGE);
    if (this.evaluatedOn !== this.clock.today()) await this.evaluateAll();

    const status = query.status ?? 'unresolved';
    const alerts = await this.dataSource.manager.find(StockAlert, {
      where: {
        type: query.type ? query.type : In(LEVEL_TYPES),
        ...(status === 'unresolved'
          ? { status: Not(AlertStatus.RESOLVED) }
          : status === 'resolved'
            ? { status: AlertStatus.RESOLVED }
            : {}),
      },
      relations: { medicine: true, acknowledgedBy: true },
      order: { raisedAt: 'DESC' },
      take: 500,
    });
    const levels = new Map(
      (
        await this.evaluator.levels(
          this.dataSource.manager,
          [...new Set(alerts.map((a) => a.medicine.id))],
        )
      ).map((l) => [l.medicineId, l.sellable]),
    );
    const views = alerts.map((a) => this.view(a, levels.get(a.medicine.id) ?? 0));
    // Unresolved first; out of stock before low stock; then the lowest stock.
    const rank = (v: AlertView) =>
      (v.status === AlertStatus.RESOLVED ? 2 : 0) +
      (v.type === AlertType.OUT_OF_STOCK ? 0 : 1);
    return views.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.sellable - b.sellable ||
        b.raisedAt.getTime() - a.raisedAt.getTime(),
    );
  }

  /** FR-34: records who saw the alert and when; it stays until stock recovers. */
  async acknowledge(actor: Actor, id: string): Promise<AlertView> {
    assertPermission(actor, Permission.ALERT_MANAGE);
    await this.dataSource.transaction(async (manager) => {
      const alert = await manager
        .createQueryBuilder(StockAlert, 'a')
        .where('a.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!alert) throw new NotFound('Alert', id);
      if (alert.status === AlertStatus.RESOLVED) {
        throw new Conflict(
          'ALERT_RESOLVED',
          'This alert has already been resolved: the stock has recovered.',
        );
      }
      if (alert.status === AlertStatus.OPEN) {
        await manager.update(
          StockAlert,
          { id },
          {
            status: AlertStatus.ACKNOWLEDGED,
            acknowledgedBy: { id: actor.id },
            acknowledgedAt: new Date(),
          },
        );
      }
    });
    const alert = await this.dataSource.manager.findOneOrFail(StockAlert, {
      where: { id },
      relations: { medicine: true, acknowledgedBy: true },
    });
    const [level] = await this.evaluator.levels(this.dataSource.manager, [
      alert.medicine.id,
    ]);
    return this.view(alert, level?.sellable ?? 0);
  }

  /**
   * Every medicine, in one ledger transaction: the ledger locks them in
   * ascending id and evaluates them before it commits.
   */
  private async evaluateAll(): Promise<void> {
    const today = this.clock.today();
    const ids = (
      await this.dataSource.manager.find(Medicine, { select: { id: true } })
    ).map((m) => m.id);
    if (ids.length > 0) {
      await this.ledger.run((tx) => tx.lockMedicines(ids));
    }
    this.evaluatedOn = today;
  }

  private view(alert: StockAlert, sellable: number): AlertView {
    return {
      id: alert.id,
      type: alert.type,
      status: alert.status,
      message: alert.message,
      medicine: {
        id: alert.medicine.id,
        code: alert.medicine.code,
        name: alert.medicine.name,
        reorderLevel: alert.medicine.reorderLevel,
      },
      sellable,
      raisedAt: alert.raisedAt,
      acknowledgedBy: alert.acknowledgedBy
        ? { id: alert.acknowledgedBy.id, fullName: alert.acknowledgedBy.fullName }
        : null,
      acknowledgedAt: alert.acknowledgedAt,
      resolvedAt: alert.resolvedAt,
    };
  }
}
