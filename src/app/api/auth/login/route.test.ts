// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    SUPERVISOR_EMAIL_ALLOWLIST: 'allowed@example.com,admin@example.com',
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getUserByEmail: vi.fn(),
  isEmailInSupervisorAllowlist: vi.fn(),
}));

vi.mock('@/lib/auth/config', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn().mockResolvedValue('mock-jwt-token'),
  setSessionCookie: vi.fn(),
}));

import { POST } from './route';
import { getUserByEmail, isEmailInSupervisorAllowlist } from '@/lib/db/queries';
import { verifyPassword } from '@/lib/auth/config';

const mockUser = {
  id: 'user-123',
  email: 'allowed@example.com',
  passwordHash: '$2b$10$hashed',
  name: null,
  role: 'supervisor',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with role on valid credentials', async () => {
    vi.mocked(isEmailInSupervisorAllowlist).mockResolvedValue(false);
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const response = await POST(makeRequest({ email: 'allowed@example.com', password: 'correct' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.role).toBe('supervisor');
  });

  it('returns 400 on invalid request body', async () => {
    const response = await POST(makeRequest({ email: 'not-email' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{{{',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when email is not on any allowlist', async () => {
    vi.mocked(isEmailInSupervisorAllowlist).mockResolvedValue(false);

    const response = await POST(makeRequest({ email: 'unknown@example.com', password: 'test' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 when user does not exist in DB', async () => {
    vi.mocked(isEmailInSupervisorAllowlist).mockResolvedValue(false);
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const response = await POST(makeRequest({ email: 'allowed@example.com', password: 'test' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 on wrong password (same error as not-on-allowlist)', async () => {
    vi.mocked(isEmailInSupervisorAllowlist).mockResolvedValue(false);
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const response = await POST(makeRequest({ email: 'allowed@example.com', password: 'wrong' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toBe('Access not available. Contact your project manager.');
  });

  it('checks DB allowlist when not on env allowlist', async () => {
    vi.mocked(isEmailInSupervisorAllowlist).mockResolvedValue(true);
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const response = await POST(makeRequest({ email: 'db-only@example.com', password: 'correct' }));

    expect(response.status).toBe(200);
    expect(isEmailInSupervisorAllowlist).toHaveBeenCalledWith('db-only@example.com');
  });
});
