import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { ReturnsController } from './returns.controller.js';
import { ReturnsService } from './returns.service.js';

/** UC08 returns. StockModule provides the StockLedger and the Clock. */
@Module({
  imports: [StockModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
