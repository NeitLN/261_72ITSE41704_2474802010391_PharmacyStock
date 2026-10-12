import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { dataSourceOptions } from './database/data-source-options.js';
import { StockModule } from './stock/stock.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // Runs after ConfigModule has loaded .env into process.env.
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions() }),
    AuthModule,
    StockModule,
    CatalogueModule,
    SuppliersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
