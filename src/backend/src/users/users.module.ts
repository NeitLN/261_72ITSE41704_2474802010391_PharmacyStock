import { Module } from '@nestjs/common';
import { AuditLogsController, RolesController, UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/** UC15 users, roles and the audit log (FR-40, FR-41). */
@Module({
  controllers: [UsersController, RolesController, AuditLogsController],
  providers: [UsersService],
})
export class UsersModule {}
