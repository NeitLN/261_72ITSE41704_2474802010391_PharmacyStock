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
  CreateMedicineDto,
  ListMedicinesQuery,
  UpdateMedicineDto,
} from './dto/medicine.dto.js';
import { MedicinesService } from './medicines.service.js';

@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicines: MedicinesService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListMedicinesQuery) {
    return this.medicines.list(actor, query);
  }

  /** Categories and units for the medicine form. Declared before `:id`. */
  @Get('reference-data')
  referenceData(@CurrentUser() actor: Actor) {
    return this.medicines.referenceData(actor);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.medicines.get(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: CreateMedicineDto) {
    return this.medicines.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.medicines.update(actor, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  deactivate(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.medicines.setActive(actor, id, false);
  }

  @Post(':id/activate')
  @HttpCode(200)
  activate(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.medicines.setActive(actor, id, true);
  }
}
