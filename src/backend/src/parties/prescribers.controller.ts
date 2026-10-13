import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import {
  CreatePrescriberDto,
  ListPrescribersQuery,
  UpdatePrescriberDto,
} from './dto/prescriber.dto.js';
import { PrescribersService } from './prescribers.service.js';

/** Thin HTTP layer: parse, pass the actor on, return the result. No rules here. */
@Controller('prescribers')
export class PrescribersController {
  constructor(private readonly prescribers: PrescribersService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListPrescribersQuery) {
    return this.prescribers.list(actor, query);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.prescribers.get(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: CreatePrescriberDto) {
    return this.prescribers.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: UpdatePrescriberDto,
  ) {
    return this.prescribers.update(actor, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  deactivate(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.prescribers.setActive(actor, id, false);
  }

  @Post(':id/activate')
  @HttpCode(200)
  activate(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.prescribers.setActive(actor, id, true);
  }
}
