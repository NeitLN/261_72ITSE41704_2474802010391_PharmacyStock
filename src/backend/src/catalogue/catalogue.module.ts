import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { MedicinesController } from './medicines.controller.js';
import { MedicinesService } from './medicines.service.js';
import { PriceBook } from './price-book.js';

/** UC01 medicine catalogue and current prices (UC13 price history later). */
@Module({
  imports: [StockModule],
  controllers: [MedicinesController],
  providers: [MedicinesService, PriceBook],
  exports: [MedicinesService, PriceBook],
})
export class CatalogueModule {}
