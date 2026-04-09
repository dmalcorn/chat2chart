import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/schema/api-requests';
import { env } from '@/lib/env';
import { verifyPassword } from '@/lib/auth/config';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { getUserByEmail, isEmailInSupervisorAllowlist } from '@/lib/db/queries';

function isOnEnvAllowlist(email: string): boolean {
  if (!env.SUPERVISOR_EMAIL_ALLOWLIST) return false;
  const allowed = env.SUPERVISOR_EMAIL_ALLOWLIST.split(',').map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid request body',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      );
    }

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid request body',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    // Check if email is on any allowlist
    const onEnvAllowlist = isOnEnvAllowlist(email);
    const onDbAllowlist = await isEmailInSupervisorAllowlist(email);

    if (!onEnvAllowlist && !onDbAllowlist) {
      return NextResponse.json(
        {
          error: {
            message: 'Access not available. Contact your project manager.',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 },
      );
    }

    // Verify credentials
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json(
        {
          error: {
            message: 'Access not available. Contact your project manager.',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 },
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        {
          error: {
            message: 'Access not available. Contact your project manager.',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 },
      );
    }

    // Create session
    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: 'supervisor',
    });

    const response = NextResponse.json({ data: { role: 'supervisor' } }, { status: 200 });

    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
