import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { SchedulePriceDto } from './dto/price.dto.js';
import { PricesService } from './prices.service.js';

/** UC13: a medicine's price history, scheduling and cancelling (FR-04). */
@Controller('medicines/:id/prices')
export class PricesController {
  constructor(private readonly prices: PricesService) {}

  @Get()
  history(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.prices.history(actor, id);
  }

  @Post()
  schedule(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: SchedulePriceDto,
  ) {
    return this.prices.schedule(actor, id, dto);
  }

  @Delete(':priceId')
  @HttpCode(204)
  async cancel(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @UuidParam('priceId') priceId: string,
  ): Promise<void> {
    await this.prices.cancel(actor, id, priceId);
  }
}
