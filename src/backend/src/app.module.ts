import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { QuarantineModule } from './quarantine/quarantine.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BatchesModule } from './batches/batches.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { dataSourceOptions } from './database/data-source-options.js';
import { PartiesModule } from './parties/parties.module.js';
import { PrescriptionsModule } from './prescriptions/prescriptions.module.js';
import { DispensingModule } from './dispensing/dispensing.module.js';
import { LookupModule } from './lookup/lookup.module.js';
import { ReceivingModule } from './receiving/receiving.module.js';
import { ReturnsModule } from './returns/returns.module.js';
import { SalesModule } from './sales/sales.module.js';
import { StockModule } from './stock/stock.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { StockTakeModule } from './stocktake/stocktake.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // Runs after ConfigModule has loaded .env into process.env.
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions() }),
    AuthModule,
    StockModule,
    CatalogueModule,
    ReceivingModule,
    SuppliersModule,
    PartiesModule,
    PrescriptionsModule,
    DispensingModule,
    SalesModule,
    ReturnsModule,
    LookupModule,
    StockTakeModule,
    ReportsModule,
    BatchesModule,
    AlertsModule,
    QuarantineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
