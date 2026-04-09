import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: { message: 'No valid session', code: 'UNAUTHORIZED' } },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      data: {
        userId: session.userId,
        email: session.email,
        role: session.role,
      },
    },
    { status: 200 },
  );
}
