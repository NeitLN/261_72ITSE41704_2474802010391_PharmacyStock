import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators.js';
import { Clock } from './stock/clock.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly clock: Clock,
  ) {}

  /** Health check, public like sign-in (access-control.md). */
  @Public()
  @Get()
  health(): { status: 'ok' } {
    return this.appService.health();
  }

  /**
   * The business date the server works on (DEC-01), so forms default to the
   * same "today" the API validates against, not the browser's clock (#255).
   * Any signed-in user may read it.
   */
  @Get('clock')
  getClock(): { today: string } {
    return { today: this.clock.today() };
  }
}
