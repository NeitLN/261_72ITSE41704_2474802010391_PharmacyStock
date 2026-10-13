import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import {
  ListPrescriptionsQuery,
  PrescriptionDto,
  VerifyPrescriptionDto,
} from './dto/prescription.dto.js';
import { PrescriptionsService } from './prescriptions.service.js';

/** UC05. Thin HTTP layer; the rules live in PrescriptionsService. */
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListPrescriptionsQuery) {
    return this.prescriptions.list(actor, query);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.prescriptions.get(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: PrescriptionDto) {
    return this.prescriptions.create(actor, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: PrescriptionDto,
  ) {
    return this.prescriptions.update(actor, id, dto);
  }

  @Post(':id/verify')
  @HttpCode(200)
  verify(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: VerifyPrescriptionDto,
  ) {
    return this.prescriptions.verify(actor, id, dto);
  }
}
