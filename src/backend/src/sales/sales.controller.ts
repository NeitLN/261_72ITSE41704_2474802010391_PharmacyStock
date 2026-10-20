import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { SaleDto } from './dto/sale.dto.js';
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

  /** The receipt again, to show or print. */
  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.sales.get(actor, id);
  }
}
