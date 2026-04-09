import { NextResponse } from 'next/server';
import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getProjectById,
  getProcessNodeById,
} from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!validateTokenFormat(token)) {
      return NextResponse.json(
        {
          error: {
            message: "This link isn't valid. Contact the person who sent it to you.",
            code: 'INVALID_TOKEN',
          },
        },
        { status: 404 },
      );
    }

    const tokenRow = await getInterviewTokenByToken(token);

    if (!tokenRow) {
      return NextResponse.json(
        {
          error: {
            message: "This link isn't valid. Contact the person who sent it to you.",
            code: 'INVALID_TOKEN',
          },
        },
        { status: 404 },
      );
    }

    const [interview, project, processNode] = await Promise.all([
      getInterviewByTokenId(tokenRow.id),
      getProjectById(tokenRow.projectId),
      getProcessNodeById(tokenRow.processNodeId),
    ]);

    if (!project || !processNode) {
      return NextResponse.json(
        {
          error: {
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        token: tokenRow.token,
        intervieweeName: tokenRow.intervieweeName,
        intervieweeRole: tokenRow.intervieweeRole,
        interviewState: interview?.status ?? 'pending',
        project: {
          id: project.id,
          name: project.name,
          skillName: project.skillName,
        },
        processNode: {
          id: processNode.id,
          name: processNode.name,
        },
      },
    });
  } catch (error) {
    console.error('Interview token route error:', error);
    return NextResponse.json(
      {
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
