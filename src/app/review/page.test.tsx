// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  validateSession: vi.fn(),
}));

import ReviewPage from './page';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth/session';

const mockRedirect = vi.mocked(redirect);
const mockCookies = vi.mocked(cookies);
const mockValidateSession = vi.mocked(validateSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
});

describe('ReviewPage', () => {
  it('redirects to /auth/login when no session cookie exists', async () => {
    mockCookies.mockResolvedValue({ get: () => undefined } as never);

    await expect(ReviewPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to /auth/login when session is invalid', async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ name: 'session', value: 'invalid-token' }),
    } as never);
    mockValidateSession.mockResolvedValue(null);

    await expect(ReviewPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });

  it('redirects to /auth/login when role is not supervisor', async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ name: 'session', value: 'valid-token' }),
    } as never);
    mockValidateSession.mockResolvedValue({
      userId: 'user-1',
      email: 'pm@example.com',
      role: 'pm',
      iat: 0,
      exp: 0,
    });

    await expect(ReviewPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });
});
