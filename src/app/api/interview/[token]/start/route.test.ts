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
  createInterview: vi.fn(),
}));

import { POST } from './route';
import { getInterviewTokenByToken, getInterviewByTokenId, createInterview } from '@/lib/db/queries';

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

function makeParams(token: string): Promise<{ token: string }> {
  return Promise.resolve({ token });
}

describe('POST /api/interview/[token]/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates interview row and returns 201 with interview ID and status active', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(createInterview).mockResolvedValue({
      id: 'new-interview-id',
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

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/start', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.interviewId).toBe('new-interview-id');
    expect(body.data.status).toBe('active');
    expect(createInterview).toHaveBeenCalledWith({
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'active',
      startedAt: expect.any(Date),
    });
  });

  it('returns 409 INTERVIEW_ALREADY_STARTED when interview exists with active status', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'existing-interview-id',
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

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/start', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('INTERVIEW_ALREADY_STARTED');
    expect(body.error.message).toBe('This interview has already been started.');
    expect(createInterview).not.toHaveBeenCalled();
  });

  it('returns 404 INVALID_TOKEN for invalid UUID format', async () => {
    const request = new Request('http://localhost/api/interview/not-a-uuid/start', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams('not-a-uuid') });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
    expect(getInterviewTokenByToken).not.toHaveBeenCalled();
  });

  it('returns 404 with exact error message for nonexistent token', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(null);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/start', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
    expect(body.error.message).toBe(
      "This link isn't valid. Contact the person who sent it to you.",
    );
  });

  it('returns 500 INTERNAL_ERROR on unexpected DB error', async () => {
    vi.mocked(getInterviewTokenByToken).mockRejectedValue(new Error('DB connection failed'));

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/start', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('allows starting when existing interview has pending status', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      id: 'existing-interview-id',
      tokenId: 'token-row-id-123',
      projectId: 'project-id-123',
      processNodeId: 'node-id-123',
      status: 'pending',
      llmProvider: null,
      sttProvider: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(createInterview).mockResolvedValue({
      id: 'new-interview-id',
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

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/start', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.interviewId).toBe('new-interview-id');
    expect(createInterview).toHaveBeenCalled();
  });
});
