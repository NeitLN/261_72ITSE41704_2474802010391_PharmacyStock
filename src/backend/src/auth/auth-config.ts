import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';

/** FR-38: a session ends 8 hours after sign-in. */
export const SESSION_SECONDS = 8 * 60 * 60;

/**
 * `jwt` (the default): sign in with a password and send the token.
 * `dev`: the temporary `X-Dev-User` switch with no password, for a
 * developer's own machine and the e2e tests only.
 */
export type AuthMode = 'jwt' | 'dev';

export function authMode(): AuthMode {
  return process.env.AUTH_MODE === 'dev' ? 'dev' : 'jwt';
}

/**
 * The secret that signs session tokens, read once when the app starts.
 *
 * Refuses to start without `JWT_SECRET` in `jwt` mode, and refuses `dev` mode
 * in production. In `dev` mode without a secret a random one is used, so
 * sign-in still works on a machine whose `.env` predates UC16; tokens then
 * stop working when the backend restarts.
 */
export function jwtSecret(): string {
  const mode = authMode();
  if (mode === 'dev' && process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_MODE=dev has no passwords and must not run in production.',
    );
  }
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (mode === 'jwt') {
    throw new Error(
      'JWT_SECRET is not set. Copy it from .env.example into .env.',
    );
  }
  new Logger('Auth').warn(
    'JWT_SECRET is not set; using a random secret until the backend restarts.',
  );
  return randomBytes(32).toString('hex');
}
