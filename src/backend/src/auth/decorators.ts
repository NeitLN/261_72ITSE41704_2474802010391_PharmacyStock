import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Actor } from './actor.js';

export interface AuthenticatedRequest extends Request {
  user?: Actor;
}

/** Injects the authenticated `Actor` into a controller method. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

export const IS_PUBLIC = 'isPublic';

/** Marks a route that needs no signed-in user (health check, sign-in). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
