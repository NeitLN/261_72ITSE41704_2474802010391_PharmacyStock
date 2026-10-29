import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsBoolean, IsIn, IsString, Length } from 'class-validator';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { QuarantineService } from './quarantine.service.js';

export class AssessDto {
  @IsIn(['release', 'reject'], { message: 'Choose release or reject.' })
  outcome: 'release' | 'reject';

  @IsBoolean({ message: 'Say whether the packaging is intact.' })
  packagingIntact: boolean;

  @IsBoolean({ message: 'Say whether the storage is credible.' })
  storageCredible: boolean;

  @IsString({ message: 'Write what you checked.' })
  @Length(3, 500, { message: 'Write what you checked (3–500 characters).' })
  note: string;
}

/** UC11 assessment of quarantined returns (FR-46). */
@Controller('quarantine')
export class QuarantineController {
  constructor(private readonly quarantine: QuarantineService) {}

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.quarantine.list(actor);
  }

  @Post(':id/assess')
  @HttpCode(200)
  assess(@CurrentUser() actor: Actor, @UuidParam() id: string, @Body() dto: AssessDto) {
    return this.quarantine.assess(actor, id, dto);
  }
}
