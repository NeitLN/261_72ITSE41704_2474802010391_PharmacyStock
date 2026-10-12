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
  CreateSupplierDto,
  ListSuppliersQuery,
  UpdateSupplierDto,
} from './dto/supplier.dto.js';
import { SuppliersService } from './suppliers.service.js';

/** Thin HTTP layer: parse, pass the actor on, return the result. No rules here. */
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListSuppliersQuery) {
    return this.suppliers.list(actor, query);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.suppliers.get(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(actor, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  deactivate(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.suppliers.setActive(actor, id, false);
  }

  @Post(':id/activate')
  @HttpCode(200)
  activate(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.suppliers.setActive(actor, id, true);
  }
}
