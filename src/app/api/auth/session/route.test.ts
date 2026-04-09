// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

import { GET } from './route';
import { createSession } from '@/lib/auth/session';

describe('GET /api/auth/session', () => {
  it('returns user data when valid session exists', async () => {
    const token = await createSession({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'supervisor',
    });

    const request = new NextRequest('http://localhost/api/auth/session', {
      headers: { cookie: `session=${token}` },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.userId).toBe('user-123');
    expect(body.data.email).toBe('test@example.com');
    expect(body.data.role).toBe('supervisor');
  });

  it('returns 401 when no session cookie', async () => {
    const request = new NextRequest('http://localhost/api/auth/session');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when session cookie is invalid', async () => {
    const request = new NextRequest('http://localhost/api/auth/session', {
      headers: { cookie: 'session=invalid-token' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
