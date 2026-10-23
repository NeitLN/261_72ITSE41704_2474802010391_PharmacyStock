import { Controller, Get, Injectable, Param, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { ValidationFailed } from '../common/errors.js';
import { UuidParam } from '../common/validation.js';
import { ExpiryReport } from './expiry.report.js';
import { LowStockReport } from './low-stock.report.js';
import type { ReportGenerator } from './report-generator.js';
import { StockMovementReport } from './stock-movement.report.js';

/** The report kinds, chosen by name (decision D14). */
@Injectable()
export class ReportRegistry {
  private readonly byKind: Map<string, ReportGenerator<object, unknown, unknown>>;

  constructor(
    readonly stockMovement: StockMovementReport,
    lowStock: LowStockReport,
    expiry: ExpiryReport,
  ) {
    const all: Array<ReportGenerator<object, unknown, unknown>> = [
      stockMovement,
      lowStock,
      expiry,
    ];
    this.byKind = new Map(all.map((r) => [r.kind, r]));
  }

  get(kind: string): ReportGenerator<object, unknown, unknown> {
    const report = this.byKind.get(kind);
    if (!report) {
      throw ValidationFailed.field(
        'kind',
        `Unknown report. Choose one of: ${[...this.byKind.keys()].join(', ')}.`,
      );
    }
    return report;
  }
}

/** UC10–UC12 reports: one route for every kind, read only. */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportRegistry) {}

  @Get('stock-movement/medicines/:id')
  movements(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reports.stockMovement.movements(actor, id, query);
  }

  @Get(':kind')
  generate(
    @CurrentUser() actor: Actor,
    @Param('kind') kind: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reports.get(kind).generate(actor, query);
  }
}
