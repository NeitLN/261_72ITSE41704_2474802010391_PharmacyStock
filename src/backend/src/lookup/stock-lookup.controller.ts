import { Controller, Get, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { StockQuery } from './dto/stock-query.dto.js';
import { StockLookupService } from './stock-lookup.service.js';

/** UC04 — look up stock and batch history. Read only. */
@Controller('stock')
export class StockLookupController {
  constructor(private readonly lookup: StockLookupService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: StockQuery) {
    return this.lookup.list(actor, query);
  }

  @Get('medicines/:id')
  medicine(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.lookup.medicine(actor, id);
  }

  @Get('batches/:id/movements')
  history(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.lookup.history(actor, id);
  }
}
