import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { DispensingController } from './dispensing.controller.js';
import { DispensingService } from './dispensing.service.js';

/** UC06 dispensing. StockModule provides the StockLedger and the Clock. */
@Module({
  imports: [StockModule],
  controllers: [DispensingController],
  providers: [DispensingService],
})
export class DispensingModule {}
