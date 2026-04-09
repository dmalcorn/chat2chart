import { describe, expect, it } from 'vitest';
import { envSchema } from './env-schema';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
  SESSION_SECRET: 'a-session-secret-that-is-at-least-32-chars-long',
  SUPERVISOR_EMAIL_ALLOWLIST: 'admin@example.com',
  FIRST_SUPERVISOR_EMAIL: 'admin@example.com',
  FIRST_SUPERVISOR_PASSWORD: 'password123',
  NODE_ENV: 'development' as const,
};

function omit<T extends Record<string, unknown>>(obj: T, key: keyof T): Omit<T, typeof key> {
  const rest = { ...obj };
  delete rest[key];
  return rest;
}

describe('Environment Validation', () => {
  it('passes with all valid environment variables', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('fails when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse(omit(validEnv, 'DATABASE_URL'));
    expect(result.success).toBe(false);
  });

  it('fails when DATABASE_URL does not start with postgresql://', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: 'mysql://localhost/db',
    });
    expect(result.success).toBe(false);
  });

  it('fails when SESSION_SECRET is missing', () => {
    const result = envSchema.safeParse(omit(validEnv, 'SESSION_SECRET'));
    expect(result.success).toBe(false);
  });

  it('fails when SESSION_SECRET is too short', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SESSION_SECRET: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('defaults ANTHROPIC_API_KEY to empty string when missing', () => {
    const result = envSchema.safeParse(omit(validEnv, 'ANTHROPIC_API_KEY'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ANTHROPIC_API_KEY).toBe('');
    }
  });

  it('rejects ANTHROPIC_API_KEY without sk-ant- prefix', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      ANTHROPIC_API_KEY: 'invalid-key',
    });
    expect(result.success).toBe(false);
  });

  it('accepts ANTHROPIC_API_KEY with sk-ant- prefix', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      ANTHROPIC_API_KEY: 'sk-ant-valid-key-123',
    });
    expect(result.success).toBe(true);
  });

  it('defaults NODE_ENV to development when missing', () => {
    const result = envSchema.safeParse(omit(validEnv, 'NODE_ENV'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('rejects invalid NODE_ENV value', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'staging',
    });
    expect(result.success).toBe(false);
  });

  it('allows FIRST_SUPERVISOR_EMAIL to be omitted', () => {
    const result = envSchema.safeParse(omit(validEnv, 'FIRST_SUPERVISOR_EMAIL'));
    expect(result.success).toBe(true);
  });

  it('allows FIRST_SUPERVISOR_PASSWORD to be omitted', () => {
    const result = envSchema.safeParse(omit(validEnv, 'FIRST_SUPERVISOR_PASSWORD'));
    expect(result.success).toBe(true);
  });

  it('rejects FIRST_SUPERVISOR_PASSWORD shorter than 8 chars', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      FIRST_SUPERVISOR_PASSWORD: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email for FIRST_SUPERVISOR_EMAIL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      FIRST_SUPERVISOR_EMAIL: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('defaults SUPERVISOR_EMAIL_ALLOWLIST to empty string', () => {
    const result = envSchema.safeParse(omit(validEnv, 'SUPERVISOR_EMAIL_ALLOWLIST'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SUPERVISOR_EMAIL_ALLOWLIST).toBe('');
    }
  });
});
