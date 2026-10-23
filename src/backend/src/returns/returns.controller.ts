import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { ReturnDto } from './dto/return.dto.js';
import { ReturnsService } from './returns.service.js';

/** UC08. Thin HTTP layer; the rules live in ReturnsService. */
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  /** The sale on the receipt and what each line can still return (A8: 404). */
  @Get('sales/:receiptNumber')
  findSale(
    @CurrentUser() actor: Actor,
    @Param('receiptNumber') receiptNumber: string,
  ) {
    return this.returns.findSale(actor, receiptNumber);
  }

  /** The confirmed return: the goods go into quarantine (BR11, DEC-04). */
  @Post()
  record(@CurrentUser() actor: Actor, @Body() dto: ReturnDto) {
    return this.returns.record(actor, dto);
  }

  /** The return slip again, to show or print. */
  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.returns.get(actor, id);
  }
}
