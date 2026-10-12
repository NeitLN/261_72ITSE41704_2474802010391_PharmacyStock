import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { dataSourceOptions } from './database/data-source-options.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    // Runs after ConfigModule has loaded .env into process.env.
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions() }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
