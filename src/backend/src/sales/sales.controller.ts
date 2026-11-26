import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { CartCancellationDto, ListSalesQuery, SaleDto } from './dto/sale.dto.js';
import { SalesService } from './sales.service.js';

/** UC07. Thin HTTP layer; the rules live in SalesService. */
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  /** The confirmed payment: the only step that moves stock (FR-45). */
  @Post()
  record(@CurrentUser() actor: Actor, @Body() dto: SaleDto) {
    return this.sales.record(actor, dto);
  }

  /** The sales of one business day, newest first: for a return, or to check a payment. */
  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListSalesQuery) {
    return this.sales.list(actor, query.date);
  }

  /** A cart given up before payment: nothing moves, the reason is audited (TC-59). */
  @Post('cancellations')
  @HttpCode(204)
  async cancelCart(@CurrentUser() actor: Actor, @Body() dto: CartCancellationDto): Promise<void> {
    await this.sales.recordCartCancellation(actor, dto);
  }

  /** Hand-overs from UC06 waiting for payment. Declared before `:id`. */
  @Get('billable')
  billable(@CurrentUser() actor: Actor) {
    return this.sales.billable(actor);
  }

  /** The receipt again, to show or print. */
  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.sales.get(actor, id);
  }
}
