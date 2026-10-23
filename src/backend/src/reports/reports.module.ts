import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { ExpiryReport } from './expiry.report.js';
import { LowStockReport } from './low-stock.report.js';
import { ReportRegistry, ReportsController } from './reports.controller.js';
import { StockMovementReport } from './stock-movement.report.js';

/** UC10–UC12 reports through one ReportGenerator (decision D14). */
@Module({
  imports: [StockModule],
  controllers: [ReportsController],
  providers: [StockMovementReport, LowStockReport, ExpiryReport, ReportRegistry],
  exports: [ReportRegistry],
})
export class ReportsModule {}
