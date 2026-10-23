import { Controller, Get, Param } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
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
}
