// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock env before importing middleware
vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

import { withSupervisorAuth, withPMAuth } from './middleware';
import { createSession, SessionPayload } from './session';

function makeRequest(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return new NextRequest('http://localhost/api/review', { headers });
}

describe('withSupervisorAuth Middleware', () => {
  const mockHandler = vi.fn((_req: NextRequest, session: SessionPayload) =>
    NextResponse.json({ data: { userId: session.userId } }),
  );

  it('returns 401 when no session cookie is present', async () => {
    const wrapped = withSupervisorAuth(mockHandler);
    const response = await wrapped(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Authentication required');
  });

  it('returns 401 when session cookie is invalid', async () => {
    const wrapped = withSupervisorAuth(mockHandler);
    const response = await wrapped(makeRequest('session=invalid-token'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('calls handler with session when valid supervisor token', async () => {
    const token = await createSession({
      userId: 'test-user-id',
      email: 'supervisor@example.com',
      role: 'supervisor',
    });

    const wrapped = withSupervisorAuth(mockHandler);
    const response = await wrapped(makeRequest(`session=${token}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.userId).toBe('test-user-id');
    expect(mockHandler).toHaveBeenCalled();
  });

  it('passes session payload to handler', async () => {
    const token = await createSession({
      userId: 'user-123',
      email: 'sup@test.com',
      role: 'supervisor',
    });

    const handler = vi.fn((_req: NextRequest, session: SessionPayload) => {
      expect(session.userId).toBe('user-123');
      expect(session.email).toBe('sup@test.com');
      expect(session.role).toBe('supervisor');
      return NextResponse.json({ data: { ok: true } });
    });

    const wrapped = withSupervisorAuth(handler);
    await wrapped(makeRequest(`session=${token}`));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('withPMAuth Middleware', () => {
  const mockHandler = vi.fn((_req: NextRequest, session: SessionPayload) =>
    NextResponse.json({ data: { userId: session.userId } }),
  );

  it('returns 401 when no session cookie is present', async () => {
    const wrapped = withPMAuth(mockHandler);
    const response = await wrapped(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Authentication required');
  });

  it('returns 403 when session role is supervisor', async () => {
    const token = await createSession({
      userId: 'sup-user',
      email: 'supervisor@example.com',
      role: 'supervisor',
    });

    const wrapped = withPMAuth(mockHandler);
    const response = await wrapped(makeRequest(`session=${token}`));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('calls handler when session role is pm', async () => {
    const token = await createSession({
      userId: 'pm-user',
      email: 'pm@example.com',
      role: 'pm',
    });

    const wrapped = withPMAuth(mockHandler);
    const response = await wrapped(makeRequest(`session=${token}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.userId).toBe('pm-user');
    expect(mockHandler).toHaveBeenCalled();
  });
});
