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
  getProjectForSupervisor: vi.fn(),
  getLeafNodeForProject: vi.fn(),
  getCapturedInterviewsWithSchemas: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: vi.fn(),
}));

import { GET } from './route';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  getProjectForSupervisor,
  getLeafNodeForProject,
  getCapturedInterviewsWithSchemas,
} from '@/lib/db/queries';

const mockGetSession = vi.mocked(getSessionFromRequest);
const mockGetProject = vi.mocked(getProjectForSupervisor);
const mockGetLeaf = vi.mocked(getLeafNodeForProject);
const mockGetInterviews = vi.mocked(getCapturedInterviewsWithSchemas);

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/review/interviews', {
    method: 'GET',
    headers: { cookie: 'session=valid-token' },
  });
}

const supervisorSession = {
  userId: 'user-1',
  email: 'supervisor@example.com',
  role: 'supervisor' as const,
  iat: 0,
  exp: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/review/interviews', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-supervisor role', async () => {
    mockGetSession.mockResolvedValue({ ...supervisorSession, role: 'pm' });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns captured interviews with schemas for authenticated supervisor', async () => {
    mockGetSession.mockResolvedValue(supervisorSession);
    mockGetProject.mockResolvedValue({
      projectId: 'proj-1',
      projectName: 'Test Project',
      supervisorName: 'Test Supervisor',
      supervisorEmail: 'supervisor@example.com',
    });
    mockGetLeaf.mockResolvedValue({
      id: 'node-1',
      projectId: 'proj-1',
      parentNodeId: null,
      name: 'Process Step',
      description: null,
      level: 1,
      nodeType: 'leaf',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockGetInterviews.mockResolvedValue([
      {
        intervieweeName: 'Rachel Torres',
        intervieweeRole: 'Austin, TX',
        schemaJson: { steps: [{ id: '1' }, { id: '2' }] },
        mermaidDefinition: 'flowchart TD\n  A("Step 1")',
        validatedAt: new Date('2026-04-05T00:00:00Z'),
      },
    ]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(body.data[0].intervieweeName).toBe('Rachel Torres');
    expect(body.data[0].intervieweeRole).toBe('Austin, TX');
    expect(body.data[0].stepCount).toBe(2);
  });

  it('returns empty array when no captured interviews', async () => {
    mockGetSession.mockResolvedValue(supervisorSession);
    mockGetProject.mockResolvedValue({
      projectId: 'proj-1',
      projectName: 'Test Project',
      supervisorName: 'Test Supervisor',
      supervisorEmail: 'supervisor@example.com',
    });
    mockGetLeaf.mockResolvedValue({
      id: 'node-1',
      projectId: 'proj-1',
      parentNodeId: null,
      name: 'Process Step',
      description: null,
      level: 1,
      nodeType: 'leaf',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockGetInterviews.mockResolvedValue([]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
  });
});
