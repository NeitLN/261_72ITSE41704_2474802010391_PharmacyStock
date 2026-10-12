import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { GoodsReceiptsController } from './goods-receipts.controller.js';
import { GoodsReceiptsService } from './goods-receipts.service.js';

/** UC03 goods receipts. */
@Module({
  imports: [StockModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
})
export class ReceivingModule {}
