import { Module } from '@nestjs/common';
import { ReturnsController } from './returns.controller.js';
import { ReturnsService } from './returns.service.js';

/** UC08 returns. Recording a return will add StockModule for the ledger. */
@Module({
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
