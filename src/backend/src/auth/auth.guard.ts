import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Unauthenticated } from '../common/errors.js';
import { authMode } from './auth-config.js';
import { AuthService } from './auth.service.js';
import { type AuthenticatedRequest, IS_PUBLIC } from './decorators.js';
import { DevAuthGuard } from './dev-auth.guard.js';

/**
 * Authenticates every route that is not `@Public()` (UC16, FR-38).
 *
 * In `jwt` mode the request must carry `Authorization: Bearer <token>` from
 * `POST /api/auth/login`. In `dev` mode the temporary `X-Dev-User` switch is
 * used instead. Either way `request.user` is the same `Actor`, so services do
 * not depend on how the user signed in.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly devGuard: DevAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (authMode() === 'dev') return this.devGuard.canActivate(context);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.header('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new Unauthenticated('Please sign in.');
    }
    request.user = await this.auth.actorFromToken(token);
    return true;
  }
}
