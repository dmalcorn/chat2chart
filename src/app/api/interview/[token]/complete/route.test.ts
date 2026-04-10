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
  getVerifiedExchangesByInterviewId: vi.fn(),
  createIndividualProcessSchema: vi.fn(),
}));

vi.mock('@/lib/synthesis/state-machine', () => ({
  transitionInterview: vi.fn(),
  InvalidStateTransitionError: class InvalidStateTransitionError extends Error {
    readonly code = 'INVALID_STATE_TRANSITION';
    constructor(current: string, target: string) {
      super(`Invalid state transition: ${current} → ${target}`);
      this.name = 'InvalidStateTransitionError';
    }
  },
}));

vi.mock('@/lib/interview/schema-extractor', () => ({
  extractProcessSchema: vi.fn(),
}));

vi.mock('@/lib/interview/individual-mermaid-generator', () => ({
  generateIndividualMermaid: vi.fn(),
}));

import { POST } from './route';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getVerifiedExchangesByInterviewId,
  createIndividualProcessSchema,
} from '@/lib/db/queries';
import { transitionInterview } from '@/lib/synthesis/state-machine';
import { extractProcessSchema } from '@/lib/interview/schema-extractor';
import { generateIndividualMermaid } from '@/lib/interview/individual-mermaid-generator';

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

const mockActiveInterview = {
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
};

function makeParams(token: string): Promise<{ token: string }> {
  return Promise.resolve({ token });
}

describe('POST /api/interview/[token]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions interview to completed and triggers schema extraction', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(mockActiveInterview);
    vi.mocked(transitionInterview).mockResolvedValue(mockActiveInterview);
    vi.mocked(getVerifiedExchangesByInterviewId).mockResolvedValue([
      {
        id: 'ex-1',
        interviewId: 'interview-id-123',
        segmentId: 'seg-1',
        sequenceNumber: 1,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Review the budget request',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ex-2',
        interviewId: 'interview-id-123',
        segmentId: 'seg-2',
        sequenceNumber: 3,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Forward to supervisor',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const mockSchema = {
      schemaVersion: '1.0',
      processNodeId: 'node-id-123',
      interviewId: 'interview-id-123',
      steps: [],
      connections: [],
      metadata: {
        extractionMethod: 'programmatic',
        extractedAt: new Date().toISOString(),
        stepCount: 1,
        decisionPointCount: 0,
      },
    };
    vi.mocked(extractProcessSchema).mockResolvedValue(mockSchema);
    vi.mocked(generateIndividualMermaid).mockReturnValue('flowchart TD\n  s1("Step 1")');
    vi.mocked(createIndividualProcessSchema).mockResolvedValue({
      id: 'schema-id-123',
      interviewId: 'interview-id-123',
      processNodeId: 'node-id-123',
      schemaJson: mockSchema,
      mermaidDefinition: 'flowchart TD\n  s1("Step 1")',
      validationStatus: 'pending_review',
      extractionMethod: 'programmatic',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('completed');
    expect(body.data.schemaReady).toBe(true);

    // Verify transition calls: active → completed, then completed → validating
    expect(transitionInterview).toHaveBeenCalledTimes(2);
    expect(transitionInterview).toHaveBeenNthCalledWith(1, 'interview-id-123', 'completed');
    expect(transitionInterview).toHaveBeenNthCalledWith(2, 'interview-id-123', 'validating');

    expect(extractProcessSchema).toHaveBeenCalled();
    expect(generateIndividualMermaid).toHaveBeenCalledWith(mockSchema);
    expect(createIndividualProcessSchema).toHaveBeenCalledWith({
      interviewId: 'interview-id-123',
      processNodeId: 'node-id-123',
      schemaJson: mockSchema,
      mermaidDefinition: 'flowchart TD\n  s1("Step 1")',
      validationStatus: 'pending_review',
      extractionMethod: 'programmatic',
    });
  });

  it('returns 409 when interview is not active', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue({
      ...mockActiveInterview,
      status: 'completed',
    });

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('INTERVIEW_NOT_ACTIVE');
    expect(transitionInterview).not.toHaveBeenCalled();
  });

  it('returns 404 for invalid token format', async () => {
    const request = new Request('http://localhost/api/interview/not-a-uuid/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams('not-a-uuid') });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
    expect(getInterviewTokenByToken).not.toHaveBeenCalled();
  });

  it('returns 404 for nonexistent token', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(null);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns success with schemaReady=false when extraction fails', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(mockActiveInterview);
    vi.mocked(transitionInterview).mockResolvedValue(mockActiveInterview);
    vi.mocked(getVerifiedExchangesByInterviewId).mockResolvedValue([
      {
        id: 'ex-1',
        interviewId: 'interview-id-123',
        segmentId: 'seg-1',
        sequenceNumber: 1,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Step one',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ex-2',
        interviewId: 'interview-id-123',
        segmentId: 'seg-2',
        sequenceNumber: 3,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Step two',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(extractProcessSchema).mockRejectedValue(new Error('Extraction failed'));

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('completed');
    expect(body.data.schemaReady).toBe(false);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getInterviewTokenByToken).mockRejectedValue(new Error('DB connection failed'));

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 409 when transitionInterview throws InvalidStateTransitionError', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(mockActiveInterview);
    vi.mocked(getVerifiedExchangesByInterviewId).mockResolvedValue([
      {
        id: 'ex-1',
        interviewId: 'interview-id-123',
        segmentId: 'seg-1',
        sequenceNumber: 1,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Step one',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ex-2',
        interviewId: 'interview-id-123',
        segmentId: 'seg-2',
        sequenceNumber: 3,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Step two',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Import the mocked class to throw it
    const { InvalidStateTransitionError } = await import('@/lib/synthesis/state-machine');
    vi.mocked(transitionInterview).mockRejectedValue(
      new InvalidStateTransitionError('completed', 'completed'),
    );

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('INTERVIEW_NOT_ACTIVE');
  });

  it('returns 422 when fewer than 2 verified exchanges exist', async () => {
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(mockActiveInterview);
    vi.mocked(getVerifiedExchangesByInterviewId).mockResolvedValue([
      {
        id: 'ex-1',
        interviewId: 'interview-id-123',
        segmentId: 'seg-1',
        sequenceNumber: 1,
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'Only one step',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request('http://localhost/api/interview/' + VALID_TOKEN + '/complete', {
      method: 'POST',
    });
    const response = await POST(request, { params: makeParams(VALID_TOKEN) });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('INSUFFICIENT_EXCHANGES');
    expect(transitionInterview).not.toHaveBeenCalled();
  });
});
