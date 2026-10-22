import { Controller, Get, Post, Query } from '@nestjs/common';
import type { Actor } from '../auth/actor.js';
import { CurrentUser } from '../auth/decorators.js';
import { UuidParam } from '../common/validation.js';
import { AlertsService } from './alerts.service.js';
import { ListAlertsQuery } from './dto/alerts.dto.js';

/** UC10. Alerts are raised and resolved by the system; people only acknowledge them. */
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: ListAlertsQuery) {
    return this.alerts.list(actor, query);
  }

  @Post(':id/acknowledge')
  acknowledge(@CurrentUser() actor: Actor, @UuidParam() id: string) {
    return this.alerts.acknowledge(actor, id);
  }
}
