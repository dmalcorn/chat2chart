// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// Mock env before importing session module
vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

import { createSession, validateSession, getSessionFromRequest } from './session';

describe('Session Management — JWT', () => {
  const testPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'supervisor' as const,
  };

  describe('createSession', () => {
    it('returns a JWT string', async () => {
      const token = await createSession(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWT has 3 parts separated by dots
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('validateSession', () => {
    it('returns payload for a valid token', async () => {
      const token = await createSession(testPayload);
      const payload = await validateSession(token);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(testPayload.userId);
      expect(payload!.email).toBe(testPayload.email);
      expect(payload!.role).toBe('supervisor');
    });

    it('includes iat and exp claims', async () => {
      const token = await createSession(testPayload);
      const payload = await validateSession(token);
      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
      // exp should be ~24h after iat
      expect(payload!.exp - payload!.iat).toBe(86400);
    });

    it('returns null for an invalid token', async () => {
      const payload = await validateSession('invalid.token.here');
      expect(payload).toBeNull();
    });

    it('returns null for a tampered token', async () => {
      const token = await createSession(testPayload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      const payload = await validateSession(tampered);
      expect(payload).toBeNull();
    });

    it('returns null for an empty string', async () => {
      const payload = await validateSession('');
      expect(payload).toBeNull();
    });
  });

  describe('getSessionFromRequest', () => {
    it('returns payload when session cookie is present', async () => {
      const token = await createSession(testPayload);
      const request = new Request('http://localhost/api/test', {
        headers: { cookie: `session=${token}` },
      });
      const payload = await getSessionFromRequest(request);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(testPayload.userId);
    });

    it('returns null when no cookie header', async () => {
      const request = new Request('http://localhost/api/test');
      const payload = await getSessionFromRequest(request);
      expect(payload).toBeNull();
    });

    it('returns null when session cookie is missing', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { cookie: 'other=value' },
      });
      const payload = await getSessionFromRequest(request);
      expect(payload).toBeNull();
    });

    it('returns null when session cookie has invalid token', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { cookie: 'session=invalid-token' },
      });
      const payload = await getSessionFromRequest(request);
      expect(payload).toBeNull();
    });
  });
});
