import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';

/** Global, so sign-in, stock takes and prices can write the log (FR-41). */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
