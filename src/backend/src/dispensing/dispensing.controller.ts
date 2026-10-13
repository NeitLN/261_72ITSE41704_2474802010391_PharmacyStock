import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { DispensingService } from './dispensing.service.js';
import { DispenseDto, DispensePreviewDto } from './dto/dispense.dto.js';

/** UC06. Thin HTTP layer; the rules live in DispensingService. */
@Controller('dispensings')
export class DispensingController {
  constructor(private readonly dispensing: DispensingService) {}

  /** What FEFO would issue now; changes nothing. */
  @Post('preview')
  @HttpCode(200)
  preview(@CurrentUser() actor: Actor, @Body() dto: DispensePreviewDto) {
    return this.dispensing.preview(actor, dto);
  }

  /** The confirmed hand-over: the only step that moves stock (FR-45). */
  @Post()
  dispense(@CurrentUser() actor: Actor, @Body() dto: DispenseDto) {
    return this.dispensing.dispense(actor, dto);
  }
}
