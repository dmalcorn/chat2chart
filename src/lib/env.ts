import { z } from 'zod/v4';
import type { Env } from './env-schema';
import { envSchema } from './env-schema';

export { envSchema } from './env-schema';
export type { Env } from './env-schema';

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('Environment validation failed:\n', formatted);
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

// Lazy validation — only runs when env is first accessed at runtime,
// not at import time during next build
let _env: Env | undefined;
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!_env) {
      _env = validateEnv();
    }
    return _env[prop as keyof Env];
  },
});
