import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionPayload } from './session';

type AuthenticatedHandler = (
  request: NextRequest,
  session: SessionPayload,
) => Promise<NextResponse> | NextResponse;

export function withSupervisorAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 },
      );
    }

    if (session.role !== 'supervisor') {
      return NextResponse.json(
        {
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 },
      );
    }

    return handler(request, session);
  };
}

export function withPMAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
        { status: 401 },
      );
    }

    if (session.role !== 'pm') {
      return NextResponse.json(
        {
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 },
      );
    }

    return handler(request, session);
  };
}
