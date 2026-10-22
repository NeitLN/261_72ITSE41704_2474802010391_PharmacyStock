import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { StockLookupController } from './stock-lookup.controller.js';
import { StockLookupService } from './stock-lookup.service.js';

/** UC04 stock lookup. StockModule provides the business Clock. */
@Module({
  imports: [StockModule],
  controllers: [StockLookupController],
  providers: [StockLookupService],
})
export class LookupModule {}
