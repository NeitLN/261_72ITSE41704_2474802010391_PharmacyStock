import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer, Prescriber } from '../entities/index.js';
import { StockModule } from '../stock/stock.module.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { PrescribersController } from './prescribers.controller.js';
import { PrescribersService } from './prescribers.service.js';

/**
 * UC05 quick-create of customers and prescribers (FR-15).
 * StockModule is imported for the Clock, following CatalogueModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Customer, Prescriber]), StockModule],
  controllers: [CustomersController, PrescribersController],
  providers: [CustomersService, PrescribersService],
  exports: [CustomersService, PrescribersService],
})
export class PartiesModule {}
