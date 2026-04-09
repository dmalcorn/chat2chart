import { NextResponse } from 'next/server';
import { validateTokenFormat } from '@/lib/interview/token';
import { getInterviewTokenByToken, getInterviewByTokenId, createInterview } from '@/lib/db/queries';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
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

    const existingInterview = await getInterviewByTokenId(tokenRow.id);

    if (existingInterview && existingInterview.status !== 'pending') {
      return NextResponse.json(
        {
          error: {
            message: 'This interview has already been started.',
            code: 'INTERVIEW_ALREADY_STARTED',
          },
        },
        { status: 409 },
      );
    }

    const newInterview = await createInterview({
      tokenId: tokenRow.id,
      projectId: tokenRow.projectId,
      processNodeId: tokenRow.processNodeId,
      status: 'active',
      startedAt: new Date(),
    });

    return NextResponse.json(
      {
        data: {
          interviewId: newInterview.id,
          status: 'active',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Interview start route error:', error);
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
