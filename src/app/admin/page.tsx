import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import { getProjectForPM, getLeafNodeForProject } from '@/lib/db/queries';
import { TopBar } from '@/components/shared/top-bar';
import { AdminContent } from '@/components/admin/admin-content';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    redirect('/auth/login');
  }

  const session = await validateSession(sessionCookie.value);

  if (!session || session.role !== 'pm') {
    redirect('/auth/login');
  }

  const project = await getProjectForPM();
  if (!project) {
    redirect('/auth/login');
  }

  const leafNode = await getLeafNodeForProject(project.id);
  const processNodeName = leafNode?.name ?? 'Process';

  return (
    <>
      <TopBar projectName={project.name} supervisorName={session.email} />
      <main className="mx-auto max-w-[900px] px-6 pt-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Demo Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} &mdash; {processNodeName}
          </p>
        </div>

        <AdminContent />
      </main>
    </>
  );
}
