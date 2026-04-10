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

// During `next build` in Docker, env vars aren't available.
// Skip validation and return raw process.env so the build succeeds.
// At runtime (when DATABASE_URL exists), validate once on first access.
let _env: Env | undefined;

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!_env) {
      if (!process.env.DATABASE_URL) {
        return process.env[prop];
      }
      _env = validateEnv();
    }
    return _env[prop as keyof Env];
  },
});
