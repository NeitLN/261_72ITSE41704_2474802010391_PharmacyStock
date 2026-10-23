import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { BatchStatus } from '../entities/index.js';
import { BatchesService } from './batches.service.js';

/** A reason is required; an empty one is refused by the ledger on `reason`. */
export class WriteOffDto {
  @IsString({ message: 'Say why the batch is written off.' })
  @MaxLength(500)
  reason: string;
}

export class BatchStatusDto {
  @IsEnum(BatchStatus, {
    message: `Status must be one of: ${Object.values(BatchStatus).join(', ')}.`,
  })
  status: BatchStatus;

  @IsString({ message: 'Say why the status changes.' })
  @MaxLength(500)
  reason: string;
}

/** UC11 commands on one batch. */
@Controller('batches')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Post(':id/write-off')
  @HttpCode(200)
  writeOff(@CurrentUser() actor: Actor, @UuidParam() id: string, @Body() dto: WriteOffDto) {
    return this.batches.writeOff(actor, id, dto.reason);
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(@CurrentUser() actor: Actor, @UuidParam() id: string, @Body() dto: BatchStatusDto) {
    return this.batches.setStatus(actor, id, dto.status, dto.reason);
  }
}
