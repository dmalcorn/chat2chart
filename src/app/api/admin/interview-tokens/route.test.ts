// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
    NODE_ENV: 'development',
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getProjectForPM: vi.fn(),
  getLeafNodeForProject: vi.fn(),
  getInterviewTokensWithStatusByProject: vi.fn(),
  createInterviewToken: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: vi.fn(),
}));

import { GET, POST } from './route';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  getProjectForPM,
  getLeafNodeForProject,
  getInterviewTokensWithStatusByProject,
  createInterviewToken,
} from '@/lib/db/queries';

const mockGetSession = vi.mocked(getSessionFromRequest);
const mockGetProject = vi.mocked(getProjectForPM);
const mockGetLeaf = vi.mocked(getLeafNodeForProject);
const mockGetTokens = vi.mocked(getInterviewTokensWithStatusByProject);
const mockCreateToken = vi.mocked(createInterviewToken);

const pmSession = {
  userId: 'pm-user-1',
  email: 'pm@example.com',
  role: 'pm' as const,
  iat: 0,
  exp: 0,
};

const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'A test project',
  skillName: 'test-skill',
  defaultLlmProvider: 'anthropic',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLeafNode = {
  id: 'node-1',
  projectId: 'proj-1',
  parentNodeId: null,
  name: 'Process Step',
  description: null,
  level: 2,
  nodeType: 'leaf',
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/interview-tokens', {
    method: 'GET',
    headers: { cookie: 'session=valid-token' },
  });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/interview-tokens', {
    method: 'POST',
    headers: {
      cookie: 'session=valid-token',
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/interview-tokens', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-PM role', async () => {
    mockGetSession.mockResolvedValue({ ...pmSession, role: 'supervisor' });
    const response = await GET(makeGetRequest());
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns token list for PM user', async () => {
    mockGetSession.mockResolvedValue(pmSession);
    mockGetProject.mockResolvedValue(mockProject);
    mockGetTokens.mockResolvedValue([
      {
        id: 'token-1',
        token: 'abc-123',
        intervieweeName: 'Rachel Torres',
        intervieweeRole: 'Mail Clerk',
        createdAt: new Date('2026-04-01T09:00:00Z'),
        interviewStatus: 'captured',
      },
      {
        id: 'token-2',
        token: 'def-456',
        intervieweeName: 'Janet Park',
        intervieweeRole: 'Mail Clerk',
        createdAt: new Date('2026-04-02T09:00:00Z'),
        interviewStatus: null,
      },
    ]);

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.data[0].intervieweeName).toBe('Rachel Torres');
    expect(body.data[0].status).toBe('captured');
    expect(body.data[1].status).toBe('pending');
  });

  it('returns empty array when no tokens exist', async () => {
    mockGetSession.mockResolvedValue(pmSession);
    mockGetProject.mockResolvedValue(mockProject);
    mockGetTokens.mockResolvedValue([]);

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
  });
});

describe('POST /api/admin/interview-tokens', () => {
  it('returns 401 for unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await POST(makePostRequest({ intervieweeName: 'Test' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-PM role', async () => {
    mockGetSession.mockResolvedValue({ ...pmSession, role: 'supervisor' });
    const response = await POST(makePostRequest({ intervieweeName: 'Test' }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for missing intervieweeName', async () => {
    mockGetSession.mockResolvedValue(pmSession);
    const response = await POST(makePostRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates new token with valid data', async () => {
    mockGetSession.mockResolvedValue(pmSession);
    mockGetProject.mockResolvedValue(mockProject);
    mockGetLeaf.mockResolvedValue(mockLeafNode);
    mockCreateToken.mockResolvedValue({
      id: 'new-token-id',
      projectId: 'proj-1',
      processNodeId: 'node-1',
      token: 'generated-uuid',
      intervieweeName: 'New Person',
      intervieweeRole: 'Tester',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(
      makePostRequest({ intervieweeName: 'New Person', intervieweeRole: 'Tester' }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.intervieweeName).toBe('New Person');
    expect(body.data.token).toBeDefined();
    expect(body.data.url).toContain('/interview/');
  });

  it('returns generated URL in response', async () => {
    mockGetSession.mockResolvedValue(pmSession);
    mockGetProject.mockResolvedValue(mockProject);
    mockGetLeaf.mockResolvedValue(mockLeafNode);
    mockCreateToken.mockResolvedValue({
      id: 'id',
      projectId: 'proj-1',
      processNodeId: 'node-1',
      token: 'tok',
      intervieweeName: 'Test',
      intervieweeRole: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(makePostRequest({ intervieweeName: 'Test' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.url).toMatch(/^http.*\/interview\//);
  });
});
