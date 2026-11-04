import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { MedicinesController } from './medicines.controller.js';
import { MedicinesService } from './medicines.service.js';
import { PriceBook } from './price-book.js';
import { PricesController } from './prices.controller.js';
import { PricesService } from './prices.service.js';

/** UC01 medicine catalogue and current prices; UC13 price history and scheduling. */
@Module({
  imports: [StockModule],
  controllers: [MedicinesController, PricesController],
  providers: [MedicinesService, PriceBook, PricesService],
  exports: [MedicinesService, PriceBook],
})
export class CatalogueModule {}
