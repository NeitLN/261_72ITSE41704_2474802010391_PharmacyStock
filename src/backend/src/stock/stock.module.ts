import { Module } from '@nestjs/common';
import { AlertEvaluator } from './alert-evaluator.js';
import { Clock, SystemClock } from './clock.js';
import { StockLedger } from './stock-ledger.js';

/**
 * The stock ledger, the low-stock alert evaluator it calls, and the business
 * clock, for every module that changes stock.
 */
@Module({
  providers: [
    StockLedger,
    AlertEvaluator,
    { provide: Clock, useClass: SystemClock },
  ],
  exports: [StockLedger, AlertEvaluator, Clock],
})
export class StockModule {}
