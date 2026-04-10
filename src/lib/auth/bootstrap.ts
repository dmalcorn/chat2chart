import { env } from '@/lib/env';
import { hashPassword } from './config';
import { getUserByEmail, createUser } from '@/lib/db/queries';
import { db } from '@/lib/db/connection';
import { projects, projectSupervisors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function linkSupervisorToAllProjects(userId: string): Promise<void> {
  const allProjects = await db.select({ id: projects.id }).from(projects);
  for (const project of allProjects) {
    const existing = await db.query.projectSupervisors.findFirst({
      where: and(
        eq(projectSupervisors.userId, userId),
        eq(projectSupervisors.projectId, project.id),
      ),
    });
    if (!existing) {
      await db.insert(projectSupervisors).values({
        projectId: project.id,
        userId,
      });
      console.log(`Linked supervisor to project ${project.id}`);
    }
  }
}

async function bootstrapSupervisor(): Promise<void> {
  const hasEmail = !!env.FIRST_SUPERVISOR_EMAIL;
  const hasPassword = !!env.FIRST_SUPERVISOR_PASSWORD;

  if (hasEmail !== hasPassword) {
    console.warn(
      'Bootstrap: both FIRST_SUPERVISOR_EMAIL and FIRST_SUPERVISOR_PASSWORD must be set together. Skipping supervisor bootstrap.',
    );
    return;
  }

  if (!hasEmail) {
    return;
  }

  const email = env.FIRST_SUPERVISOR_EMAIL!;
  const password = env.FIRST_SUPERVISOR_PASSWORD!;
  const existing = await getUserByEmail(email);

  if (existing) {
    console.log(`Supervisor account already exists: ${email}`);
    await linkSupervisorToAllProjects(existing.id);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    email,
    passwordHash,
    role: 'supervisor',
  });

  console.log(`Bootstrapped supervisor account: ${email}`);
  await linkSupervisorToAllProjects(user.id);
}

async function bootstrapPM(): Promise<void> {
  const hasEmail = !!env.FIRST_PM_EMAIL;
  const hasPassword = !!env.FIRST_PM_PASSWORD;

  if (hasEmail !== hasPassword) {
    console.warn(
      'Bootstrap: both FIRST_PM_EMAIL and FIRST_PM_PASSWORD must be set together. Skipping PM bootstrap.',
    );
    return;
  }

  if (!hasEmail) {
    return;
  }

  const email = env.FIRST_PM_EMAIL!;
  const password = env.FIRST_PM_PASSWORD!;
  const existing = await getUserByEmail(email);

  if (existing) {
    console.log(`PM account already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await createUser({
    email,
    passwordHash,
    role: 'pm',
  });

  console.log(`Bootstrapped PM account: ${email}`);
}

export async function bootstrapAccounts(): Promise<void> {
  await bootstrapSupervisor();
  await bootstrapPM();
}
