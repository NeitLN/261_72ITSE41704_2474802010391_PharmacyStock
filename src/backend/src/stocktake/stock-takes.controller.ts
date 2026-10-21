import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import {
  AddLineDto,
  CountLineDto,
  ListStockTakesQuery,
  OpenStockTakeDto,
  ReturnStockTakeDto,
} from './dto/stock-take.dto.js';
import { StockTakesService } from './stock-takes.service.js';

/** UC09. Counting and approval are separate steps; only approval moves stock. */
@Controller('stock-takes')
export class StockTakesController {
  constructor(private readonly stockTakes: StockTakesService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListStockTakesQuery) {
    return this.stockTakes.list(actor, query);
  }

  @Post()
  open(@CurrentUser() actor: Actor, @Body() dto: OpenStockTakeDto) {
    return this.stockTakes.open(actor, dto);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.stockTakes.get(actor, id);
  }

  @Put(':id/lines/:lineId')
  count(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @UuidParam('lineId') lineId: string,
    @Body() dto: CountLineDto,
  ) {
    return this.stockTakes.count(actor, id, lineId, dto);
  }

  @Post(':id/lines')
  addLine(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: AddLineDto,
  ) {
    return this.stockTakes.addLine(actor, id, dto);
  }

  @Post(':id/submit')
  submit(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.stockTakes.submit(actor, id);
  }

  @Post(':id/approve')
  approve(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.stockTakes.approve(actor, id);
  }

  @Post(':id/return')
  returnToCounting(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: ReturnStockTakeDto,
  ) {
    return this.stockTakes.returnToCounting(actor, id, dto);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.stockTakes.cancel(actor, id);
  }
}
