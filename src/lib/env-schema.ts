import { z } from 'zod/v4';

export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .startsWith('postgresql://', 'DATABASE_URL must start with postgresql://'),
  ANTHROPIC_API_KEY: z
    .string()
    .default('')
    .refine(
      (val) => val === '' || val.startsWith('sk-ant-'),
      'ANTHROPIC_API_KEY must start with sk-ant- when provided',
    ),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SUPERVISOR_EMAIL_ALLOWLIST: z.string().default(''),
  FIRST_SUPERVISOR_EMAIL: z.email().optional(),
  FIRST_SUPERVISOR_PASSWORD: z
    .string()
    .min(8, 'FIRST_SUPERVISOR_PASSWORD must be at least 8 characters')
    .optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;
