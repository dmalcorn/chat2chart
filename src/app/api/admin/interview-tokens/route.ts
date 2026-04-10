import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPMAuth } from '@/lib/auth/middleware';
import {
  getProjectForPM,
  getLeafNodeForProject,
  getInterviewTokensWithStatusByProject,
  createInterviewToken,
} from '@/lib/db/queries';

const createTokenSchema = z.object({
  intervieweeName: z.string().trim().min(1).max(200),
  intervieweeRole: z.string().max(200).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withPMAuth(async (_request, _session) => {
  try {
    const project = await getProjectForPM();
    if (!project) {
      return NextResponse.json(
        { error: { message: 'No project found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    const tokens = await getInterviewTokensWithStatusByProject(project.id);
    const data = tokens.map((t) => ({
      intervieweeName: t.intervieweeName,
      intervieweeRole: t.intervieweeRole,
      token: t.token,
      status: t.interviewStatus ?? 'pending',
      createdAt: new Date(t.createdAt).toISOString(),
    }));

    return NextResponse.json({ data, count: data.length });
  } catch {
    return NextResponse.json(
      { error: { message: 'Failed to fetch tokens', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withPMAuth(async (request, _session) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON body', code: 'VALIDATION_ERROR' } },
        { status: 400 },
      );
    }
    const parsed = createTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } },
        { status: 400 },
      );
    }

    const project = await getProjectForPM();
    if (!project) {
      return NextResponse.json(
        { error: { message: 'No project found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    const leafNode = await getLeafNodeForProject(project.id);
    if (!leafNode) {
      return NextResponse.json(
        { error: { message: 'No leaf process node found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    const newToken = crypto.randomUUID();
    await createInterviewToken({
      id: crypto.randomUUID(),
      projectId: project.id,
      processNodeId: leafNode.id,
      token: newToken,
      intervieweeName: parsed.data.intervieweeName,
      intervieweeRole: parsed.data.intervieweeRole,
    });

    const host = request.headers.get('host');
    const origin = request.headers.get('origin') || (host ? `https://${host}` : null);
    if (!origin) {
      return NextResponse.json(
        { error: { message: 'Cannot determine request origin', code: 'BAD_REQUEST' } },
        { status: 400 },
      );
    }
    const url = `${origin}/interview/${newToken}`;

    return NextResponse.json(
      {
        data: {
          token: newToken,
          intervieweeName: parsed.data.intervieweeName,
          url,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: { message: 'Failed to create token', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
});
