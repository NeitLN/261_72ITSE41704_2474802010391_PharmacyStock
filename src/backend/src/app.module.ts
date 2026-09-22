import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import databaseConfig from './config/database.config.js';
import { Batch } from './entities/batch.entity.js';
import { DispenseLine } from './entities/dispense-line.entity.js';
import { GoodsReceipt } from './entities/goods-receipt.entity.js';
import { Medicine } from './entities/medicine.entity.js';
import { Prescription } from './entities/prescription.entity.js';
import { Sale } from './entities/sale.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { Supplier } from './entities/supplier.entity.js';
import { User } from './entities/user.entity.js';

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
          Supplier,
          Batch,
          GoodsReceipt,
          Prescription,
          DispenseLine,
          Sale,
          StockMovement,
          User,
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
