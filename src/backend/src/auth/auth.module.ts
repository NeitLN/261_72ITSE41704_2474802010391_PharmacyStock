import { Body, Controller, Get, HttpCode, Module, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/index.js';
import type { Actor } from './actor.js';
import { jwtSecret } from './auth-config.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';
import { DevAuthGuard } from './dev-auth.guard.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** UC16: returns a session token and the user's permissions for the menu. */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  /**
   * The token is not kept on the server, so signing out is the client
   * discarding it; this route exists so the UI has one place to call.
   */
  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() actor: Actor): Promise<void> {
    await this.auth.logout(actor);
  }

  /** Who the API thinks you are; the UI builds its menu from the permissions. */
  @Get('me')
  me(@CurrentUser() actor: Actor) {
    return AuthService.view(actor);
  }
}

/** Authenticates every route that is not `@Public()`. */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // Runs after ConfigModule has loaded .env into process.env.
    JwtModule.registerAsync({ useFactory: () => ({ secret: jwtSecret() }) }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DevAuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
