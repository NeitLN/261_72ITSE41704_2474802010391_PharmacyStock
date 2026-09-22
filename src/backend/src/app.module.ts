import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import databaseConfig from './config/database.config.js';
import {
  AuditLog,
  Batch,
  Customer,
  DispenseLine,
  GoodsReceipt,
  GoodsReceiptLine,
  Medicine,
  MedicineCategory,
  MedicinePrice,
  Permission,
  Prescriber,
  Prescription,
  PrescriptionItem,
  ReturnLine,
  Role,
  Sale,
  SaleLine,
  SaleReturn,
  StockAlert,
  StockMovement,
  StockTake,
  StockTakeLine,
  Supplier,
  UnitOfMeasure,
  User,
} from './entities/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [
          Medicine,
          MedicineCategory,
          MedicinePrice,
          UnitOfMeasure,
          Batch,
          Supplier,
          GoodsReceipt,
          GoodsReceiptLine,
          Customer,
          Prescriber,
          Prescription,
          PrescriptionItem,
          DispenseLine,
          Sale,
          SaleLine,
          SaleReturn,
          ReturnLine,
          StockMovement,
          StockTake,
          StockTakeLine,
          StockAlert,
          User,
          Role,
          Permission,
          AuditLog,
        ],
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
