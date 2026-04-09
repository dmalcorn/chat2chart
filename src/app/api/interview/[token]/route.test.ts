// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getInterviewTokenByToken: vi.fn(),
  getInterviewByTokenId: vi.fn(),
  getProjectById: vi.fn(),
  getProcessNodeById: vi.fn(),
}));

import { GET } from './route';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getProjectById,
  getProcessNodeById,
} from '@/lib/db/queries';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

const mockTokenRow = {
  id: 'token-row-id-123',
  projectId: 'project-id-123',
  processNodeId: 'node-id-123',
  token: VALID_TOKEN,
  intervieweeName: 'Jane Doe',
  intervieweeRole: 'Mail Clerk' as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProject = {
  id: 'project-id-123',
  name: 'Test Project',
  description: null,
  skillName: 'federal-document-processing',
  defaultLlmProvider: 'anthropic',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProcessNode = {
  id: 'node-id-123',
  projectId: 'project-id-123',
  parentNodeId: null,
  name: 'Review Budget Request',
  description: null,
  level: 1,
  nodeType: 'leaf',
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeParams(token: string): Promise<{ token: string }> {
  return Promise.resolve({ token });
}

describe('GET /api/interview/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with project, process node, interviewee info, and interview state', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'interview-id-123',
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'active',
      llmProvider: null,
      sttProvider: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.token).toBe(VALID_TOKEN);
    expect(body.data.intervieweeName).toBe('Jane Doe');
    expect(body.data.intervieweeRole).toBe('Mail Clerk');
    expect(body.data.interviewState).toBe('active');
    expect(body.data.project).toEqual({
      id: 'project-id-123',
      name: 'Test Project',
      skillName: 'federal-document-processing',
    });
    expect(body.data.processNode).toEqual({
      id: 'node-id-123',
      name: 'Review Budget Request',
    });
  });

  it('returns interviewState pending when no interview row exists', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.interviewState).toBe('pending');
  });

  it('returns interviewState active when interview is active', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'interview-id-123',
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'active',
      llmProvider: null,
      sttProvider: null,
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.interviewState).toBe('active');
  });

  it('returns 404 with INVALID_TOKEN for invalid UUID format', async () => {
    const request = new Request('http://localhost/api/interview/not-a-uuid');
    const response = await GET(request, { params: makeParams('not-a-uuid') });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
    expect(body.error.message).toBe(
      "This link isn't valid. Contact the person who sent it to you.",
    );
    expect(getInterviewTokenByToken).not.toHaveBeenCalled();
  });

  it('returns 404 with exact error message for nonexistent token', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(null);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
    expect(body.error.message).toBe(
      "This link isn't valid. Contact the person who sent it to you.",
    );
  });

  it('returns intervieweeRole null when role is not set', async () => {
    const tokenRowNullRole = { ...mockTokenRow, intervieweeRole: null };
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(tokenRowNullRole);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.intervieweeRole).toBeNull();
  });

  it('returns interviewState completed when interview is completed', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'interview-id-123',
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'completed',
      llmProvider: null,
      sttProvider: null,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.interviewState).toBe('completed');
  });

  it('returns interviewState validating when interview is validating', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'interview-id-123',
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'validating',
      llmProvider: null,
      sttProvider: null,
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.interviewState).toBe('validating');
  });

  it('returns interviewState captured when interview is captured', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'interview-id-123',
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'captured',
      llmProvider: null,
      sttProvider: null,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.interviewState).toBe('captured');
  });

  it('returns 500 when project is not found for valid token', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(null);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 when processNode is not found for valid token', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(null);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 with INTERNAL_ERROR on unexpected DB error', async () => {
    vi.mocked(getInterviewTokenByToken).mockRejectedValue(new Error('DB connection failed'));

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN);
    const response = await GET(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });
});
