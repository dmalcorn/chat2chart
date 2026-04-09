import { z } from 'zod/v4';
import { envSchema } from './env-schema';

export { envSchema } from './env-schema';
export type { Env } from './env-schema';

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('Environment validation failed:\n', formatted);
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

export const env = validateEnv();
