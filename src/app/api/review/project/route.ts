import { NextRequest, NextResponse } from 'next/server';
import { withSupervisorAuth } from '@/lib/auth/middleware';
import { getProjectForSupervisor } from '@/lib/db/queries';
import { SessionPayload } from '@/lib/auth/session';

export const GET = withSupervisorAuth(async (_request: NextRequest, session: SessionPayload) => {
  try {
    const projectInfo = await getProjectForSupervisor(session.userId);
    if (!projectInfo) {
      return NextResponse.json(
        { error: { message: 'No project found for supervisor', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        data: {
          projectName: projectInfo.projectName,
          supervisorName: projectInfo.supervisorName ?? projectInfo.supervisorEmail,
          supervisorEmail: projectInfo.supervisorEmail,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
});
