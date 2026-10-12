import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import {
  CreateGoodsReceiptDto,
  ListGoodsReceiptsQuery,
} from './dto/goods-receipt.dto.js';
import { GoodsReceiptsService } from './goods-receipts.service.js';

/** UC03. Receipts are never edited: a mistake is corrected by a stock movement. */
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly receipts: GoodsReceiptsService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListGoodsReceiptsQuery) {
    return this.receipts.list(actor, query);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.receipts.get(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: CreateGoodsReceiptDto) {
    return this.receipts.create(actor, dto);
  }
}
