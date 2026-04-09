import { env } from '@/lib/env';
import { hashPassword } from './config';
import { getUserByEmail, createUser } from '@/lib/db/queries';

export async function bootstrapAccounts(): Promise<void> {
  const hasEmail = !!env.FIRST_SUPERVISOR_EMAIL;
  const hasPassword = !!env.FIRST_SUPERVISOR_PASSWORD;

  if (hasEmail !== hasPassword) {
    console.warn(
      'Bootstrap: both FIRST_SUPERVISOR_EMAIL and FIRST_SUPERVISOR_PASSWORD must be set together. Skipping bootstrap.',
    );
    return;
  }

  if (!hasEmail) {
    return;
  }

  const email = env.FIRST_SUPERVISOR_EMAIL;
  const existing = await getUserByEmail(email);

  if (existing) {
    console.log(`Supervisor account already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(env.FIRST_SUPERVISOR_PASSWORD);
  await createUser({
    email,
    passwordHash,
    role: 'supervisor',
  });

  console.log(`Bootstrapped supervisor account: ${email}`);
}
