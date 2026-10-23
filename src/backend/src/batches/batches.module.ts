import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { BatchesController } from './batches.controller.js';
import { BatchesService } from './batches.service.js';

/** UC11 write-off and batch status through the ledger's commands (#55). */
@Module({
  imports: [StockModule],
  controllers: [BatchesController],
  providers: [BatchesService],
})
export class BatchesModule {}
