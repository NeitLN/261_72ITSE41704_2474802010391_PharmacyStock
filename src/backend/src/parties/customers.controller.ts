import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { CustomersService } from './customers.service.js';
import {
  CreateCustomerDto,
  ListCustomersQuery,
  UpdateCustomerDto,
} from './dto/customer.dto.js';

/** Thin HTTP layer: parse, pass the actor on, return the result. No rules here. */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListCustomersQuery) {
    return this.customers.list(actor, query);
  }

  @Get(':id')
  get(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.customers.get(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Actor, @Body() dto: CreateCustomerDto) {
    return this.customers.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Actor,
    @UuidParam() id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(actor, id, dto);
  }
}
