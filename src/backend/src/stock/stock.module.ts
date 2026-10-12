import { Module } from '@nestjs/common';
import { Clock, SystemClock } from './clock.js';
import { StockLedger } from './stock-ledger.js';

/** The stock ledger and the business clock, for every module that changes stock. */
@Module({
  providers: [StockLedger, { provide: Clock, useClass: SystemClock }],
  exports: [StockLedger, Clock],
})
export class StockModule {}
