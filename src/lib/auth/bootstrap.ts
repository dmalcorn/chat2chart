import { env } from '@/lib/env';
import { hashPassword } from './config';
import { getUserByEmail, createUser } from '@/lib/db/queries';

export async function bootstrapAccounts(): Promise<void> {
  if (!env.FIRST_SUPERVISOR_EMAIL || !env.FIRST_SUPERVISOR_PASSWORD) {
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
