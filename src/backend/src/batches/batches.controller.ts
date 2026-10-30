import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { IsCalendarDate, UuidParam } from '../common/validation.js';
import { BatchStatus, DestructionMethod } from '../entities/index.js';
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

/** FR-47: what was destroyed, when, how and before whom. */
export class DestructionDto {
  @IsInt({ message: 'Enter a whole number of units.' })
  @Min(1, { message: 'Destroy at least 1 unit.' })
  quantity: number;

  @IsCalendarDate({ message: 'Choose the day it was destroyed.' })
  destroyedOn: string;

  @IsEnum(DestructionMethod, {
    message: `Method must be one of: ${Object.values(DestructionMethod).join(', ')}.`,
  })
  method: DestructionMethod;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  methodNote?: string;

  @IsString({ message: 'Name the witness.' })
  @Length(2, 100, { message: 'Name the witness (2 to 100 characters).' })
  witness: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** UC11 commands on one batch. */
@Controller('batches')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get('pending-destruction')
  pendingDestruction(@CurrentUser() actor: Actor) {
    return this.batches.pendingDestruction(actor);
  }

  @Get(':id/destructions')
  destructions(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.batches.destructions(actor, id);
  }

  @Post(':id/destructions')
  recordDestruction(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: DestructionDto,
  ) {
    return this.batches.recordDestruction(actor, id, dto);
  }

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
