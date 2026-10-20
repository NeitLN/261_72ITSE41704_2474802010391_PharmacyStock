import { Module } from '@nestjs/common';
import { CatalogueModule } from '../catalogue/catalogue.module.js';
import { StockModule } from '../stock/stock.module.js';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';

/**
 * UC07 sales. StockModule provides the StockLedger and the Clock;
 * CatalogueModule the PriceBook.
 */
@Module({
  imports: [StockModule, CatalogueModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
