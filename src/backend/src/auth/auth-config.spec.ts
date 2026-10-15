import { afterEach, describe, expect, it } from 'vitest';
import { authMode, jwtSecret } from './auth-config.js';

describe('auth configuration', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  function setEnv(env: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  it('defaults to jwt when AUTH_MODE is not set', () => {
    setEnv({ AUTH_MODE: undefined });
    expect(authMode()).toBe('jwt');
  });

  it('refuses to start in jwt mode without JWT_SECRET', () => {
    setEnv({ AUTH_MODE: 'jwt', JWT_SECRET: undefined });
    expect(() => jwtSecret()).toThrow(/JWT_SECRET is not set/);
  });

  it('refuses dev mode in production, even with a secret', () => {
    setEnv({ AUTH_MODE: 'dev', NODE_ENV: 'production', JWT_SECRET: 'x' });
    expect(() => jwtSecret()).toThrow(/must not run in production/);
  });

  it('uses JWT_SECRET when it is set', () => {
    setEnv({ AUTH_MODE: 'jwt', JWT_SECRET: 'configured', NODE_ENV: undefined });
    expect(jwtSecret()).toBe('configured');
  });

  it('falls back to a random secret in dev mode without JWT_SECRET', () => {
    setEnv({ AUTH_MODE: 'dev', JWT_SECRET: undefined, NODE_ENV: undefined });
    const first = jwtSecret();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(jwtSecret()).not.toBe(first);
  });
});
