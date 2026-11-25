import { afterEach, describe, expect, it } from 'vitest';
import { authMode, EXAMPLE_SECRET, jwtSecret } from './auth-config.js';

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

  it('refuses the example secret or a short one in production', () => {
    setEnv({ AUTH_MODE: 'jwt', NODE_ENV: 'production', JWT_SECRET: EXAMPLE_SECRET });
    expect(() => jwtSecret()).toThrow(/example value or shorter/);
    setEnv({ JWT_SECRET: 'short-secret' });
    expect(() => jwtSecret()).toThrow(/example value or shorter/);
    setEnv({ JWT_SECRET: 'a'.repeat(32) });
    expect(jwtSecret()).toBe('a'.repeat(32));
  });

  it('accepts the example secret outside production (a local copy of .env.example)', () => {
    setEnv({ AUTH_MODE: 'jwt', NODE_ENV: 'development', JWT_SECRET: EXAMPLE_SECRET });
    expect(jwtSecret()).toBe(EXAMPLE_SECRET);
  });

  it('falls back to a random secret in dev mode without JWT_SECRET', () => {
    setEnv({ AUTH_MODE: 'dev', JWT_SECRET: undefined, NODE_ENV: undefined });
    const first = jwtSecret();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(jwtSecret()).not.toBe(first);
  });
});
