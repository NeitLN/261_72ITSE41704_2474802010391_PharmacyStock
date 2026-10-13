import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { PrescriptionsController } from './prescriptions.controller.js';
import { PrescriptionsService } from './prescriptions.service.js';

/** UC05 prescription intake and verification. StockModule provides the Clock. */
@Module({
  imports: [StockModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
