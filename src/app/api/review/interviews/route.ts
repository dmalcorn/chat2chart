import { NextRequest, NextResponse } from 'next/server';
import { withSupervisorAuth } from '@/lib/auth/middleware';
import {
  getCapturedInterviewsWithSchemas,
  getProjectForSupervisor,
  getLeafNodeForProject,
} from '@/lib/db/queries';
import { SessionPayload } from '@/lib/auth/session';

interface ProcessSchema {
  steps?: unknown[];
}

export const GET = withSupervisorAuth(async (_request: NextRequest, session: SessionPayload) => {
  try {
    const projectInfo = await getProjectForSupervisor(session.userId);
    if (!projectInfo) {
      return NextResponse.json({ data: [], count: 0 }, { status: 200 });
    }

    const leafNode = await getLeafNodeForProject(projectInfo.projectId);
    if (!leafNode) {
      return NextResponse.json({ data: [], count: 0 }, { status: 200 });
    }

    const interviews = await getCapturedInterviewsWithSchemas(leafNode.id);

    const slides = interviews.map((row) => {
      const schema = row.schemaJson as ProcessSchema | null;
      const stepCount = Array.isArray(schema?.steps) ? schema.steps.length : 0;

      return {
        intervieweeName: row.intervieweeName,
        intervieweeRole: row.intervieweeRole,
        validatedAt: row.validatedAt?.toISOString() ?? null,
        stepCount,
        mermaidDefinition: row.mermaidDefinition,
        schemaJson: row.schemaJson,
      };
    });

    return NextResponse.json({ data: slides, count: slides.length }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
});
