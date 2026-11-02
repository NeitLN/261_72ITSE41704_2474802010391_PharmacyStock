import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { QuarantineController } from './quarantine.controller.js';
import { QuarantineService } from './quarantine.service.js';

/** UC11 assessment of returned goods through the ledger's release and reject (FR-46). */
@Module({
  imports: [StockModule],
  controllers: [QuarantineController],
  providers: [QuarantineService],
})
export class QuarantineModule {}
