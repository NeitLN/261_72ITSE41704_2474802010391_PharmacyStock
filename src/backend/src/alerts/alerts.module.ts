import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';

/** UC10 low-stock alerts. StockModule provides the evaluator, the ledger and the Clock. */
@Module({
  imports: [StockModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
