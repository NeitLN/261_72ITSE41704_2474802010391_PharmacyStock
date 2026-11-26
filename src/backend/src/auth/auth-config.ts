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

/** The value shipped in .env.example: public, so never accepted in production. */
export const EXAMPLE_SECRET = 'local-dev-only-change-me-3f9a1c7e5b2d4f6a8c0e';
export const MIN_SECRET_LENGTH = 32;

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
  if (mode === 'dev' && process.env.NODE_ENV !== 'test') {
    new Logger('Auth').warn(
      'AUTH_MODE=dev: any X-Dev-User header signs in without a password. Use it on your own machine only.',
    );
  }
  const secret = process.env.JWT_SECRET;
  if (secret) {
    const weak = secret.length < MIN_SECRET_LENGTH || secret === EXAMPLE_SECRET;
    if (weak && process.env.NODE_ENV === 'production') {
      throw new Error(
        `JWT_SECRET is the example value or shorter than ${MIN_SECRET_LENGTH} characters. ` +
          "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    if (weak && process.env.NODE_ENV !== 'test') {
      new Logger('Auth').warn(
        'JWT_SECRET is the example value or short: anyone with the repository can sign tokens. Fine on your own machine, never elsewhere.',
      );
    }
    return secret;
  }
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
