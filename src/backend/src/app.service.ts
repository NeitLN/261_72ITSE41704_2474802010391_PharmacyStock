import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** The public health check: the API is up and answering. */
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
