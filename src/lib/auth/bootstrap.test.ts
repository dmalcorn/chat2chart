// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    FIRST_SUPERVISOR_EMAIL: 'admin@example.com',
    FIRST_SUPERVISOR_PASSWORD: 'securepassword123',
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock('./config', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

import { bootstrapAccounts } from './bootstrap';
import { getUserByEmail, createUser } from '@/lib/db/queries';
import { hashPassword } from './config';
import { env } from '@/lib/env';

describe('bootstrapAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates supervisor when no existing user found', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({
      id: 'new-id',
      email: 'admin@example.com',
      passwordHash: '$2b$10$hashedpassword',
      name: null,
      role: 'supervisor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await bootstrapAccounts();

    expect(getUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(hashPassword).toHaveBeenCalledWith('securepassword123');
    expect(createUser).toHaveBeenCalledWith({
      email: 'admin@example.com',
      passwordHash: '$2b$10$hashedpassword',
      role: 'supervisor',
    });
  });

  it('skips creation when user already exists', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'existing-id',
      email: 'admin@example.com',
      passwordHash: '$2b$10$existing',
      name: null,
      role: 'supervisor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await bootstrapAccounts();

    expect(getUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('skips when env vars are not set', async () => {
    const originalEmail = env.FIRST_SUPERVISOR_EMAIL;
    (env as Record<string, unknown>).FIRST_SUPERVISOR_EMAIL = undefined;

    await bootstrapAccounts();

    expect(getUserByEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();

    env.FIRST_SUPERVISOR_EMAIL = originalEmail;
  });
});
