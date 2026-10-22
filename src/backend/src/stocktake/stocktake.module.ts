import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { StockTakesController } from './stock-takes.controller.js';
import { StockTakesService } from './stock-takes.service.js';

/** UC09 stock takes. */
@Module({
  imports: [StockModule],
  controllers: [StockTakesController],
  providers: [StockTakesService],
})
export class StockTakeModule {}
