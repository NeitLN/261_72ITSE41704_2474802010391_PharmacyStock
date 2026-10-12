import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/index.js';
import type { Actor } from './actor.js';
import { CurrentUser } from './decorators.js';
import { DevAuthGuard } from './dev-auth.guard.js';

@Controller('auth')
export class AuthController {
  /** Who the API thinks you are; the UI builds its menu from the permissions. */
  @Get('me')
  me(@CurrentUser() actor: Actor) {
    return {
      id: actor.id,
      username: actor.username,
      fullName: actor.fullName,
      role: actor.role,
      permissions: [...actor.permissions].sort(),
    };
  }
}

/** Authenticates every route that is not `@Public()`. */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [{ provide: APP_GUARD, useClass: DevAuthGuard }],
})
export class AuthModule {}
