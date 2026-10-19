import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Unauthenticated } from '../common/errors.js';
import { User } from '../entities/index.js';
import { toActor } from './actor.js';
import { type AuthenticatedRequest, IS_PUBLIC } from './decorators.js';

export const DEV_USER_HEADER = 'x-dev-user';

/**
 * TEMPORARY stand-in for sign-in (UC16, owned by Minh, issue #43).
 *
 * With `AUTH_MODE=dev`, the request names a seeded user in the `X-Dev-User`
 * header and the guard loads that user, its role and the role's permissions
 * from the database. There is no password, so this must never run outside a
 * developer's machine; any other AUTH_MODE refuses every protected request.
 *
 * The JWT guard that replaces it only has to set `request.user` to the same
 * `Actor` shape. Services and controllers do not change.
 */
@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (process.env.AUTH_MODE !== 'dev') {
      throw new Unauthenticated('Sign-in is not available yet.');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const username = request.header(DEV_USER_HEADER);
    if (!username) {
      throw new Unauthenticated('Choose a user to act as.');
    }

    const user = await this.users.findOne({
      where: { username, isActive: true },
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new Unauthenticated(`Unknown or locked user "${username}".`);
    }

    request.user = toActor(user);
    return true;
  }
}
