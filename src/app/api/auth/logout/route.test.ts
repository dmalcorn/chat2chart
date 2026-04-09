// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

vi.mock('@/lib/auth/session', () => ({
  clearSessionCookie: vi.fn(),
}));

import { POST } from './route';
import { clearSessionCookie } from '@/lib/auth/session';

describe('POST /api/auth/logout', () => {
  it('returns success and clears session cookie', async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(clearSessionCookie).toHaveBeenCalled();
  });
});
