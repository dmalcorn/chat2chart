// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('@/lib/interview/token', () => ({
  validateTokenFormat: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  getInterviewTokenByToken: vi.fn(),
  getInterviewByTokenId: vi.fn(),
  getIndividualProcessSchemaByInterviewId: vi.fn(),
  updateIndividualProcessSchema: vi.fn(),
}));

vi.mock('@/lib/interview/correction-agent', () => ({
  streamCorrectedSchema: vi.fn(),
}));

vi.mock('@/lib/interview/individual-mermaid-generator', () => ({
  generateIndividualMermaid: vi.fn(() => 'flowchart TD'),
}));

vi.mock('@/lib/schema/workflow', () => ({
  individualProcessSchemaSchema: {
    parse: vi.fn((v: unknown) => v),
  },
}));

import { POST } from './route';
import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getIndividualProcessSchemaByInterviewId,
  updateIndividualProcessSchema,
} from '@/lib/db/queries';
import { streamCorrectedSchema } from '@/lib/interview/correction-agent';

const mockValidateToken = vi.mocked(validateTokenFormat);
const mockGetToken = vi.mocked(getInterviewTokenByToken);
const mockGetInterview = vi.mocked(getInterviewByTokenId);
const mockGetSchema = vi.mocked(getIndividualProcessSchemaByInterviewId);
const mockUpdateSchema = vi.mocked(updateIndividualProcessSchema);
const mockStreamCorrected = vi.mocked(streamCorrectedSchema);

const testToken = randomUUID();
const testTokenId = randomUUID();
const testInterviewId = randomUUID();

function makeParams(token = testToken) {
  return { params: Promise.resolve({ token }) };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/interview/test/schema/correct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/interview/[token]/schema/correct', () => {
  it('returns 404 for invalid token', async () => {
    mockValidateToken.mockReturnValue(false);

    const res = await POST(
      makeRequest({ errorDescription: 'test', currentSchema: {} }),
      makeParams('bad' as ReturnType<typeof randomUUID>),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 404 when token not found', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ errorDescription: 'test', currentSchema: {} }),
      makeParams(),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 when interview is not in validating state', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'active',
      projectId: randomUUID(),
    } as never);

    const res = await POST(
      makeRequest({ errorDescription: 'test', currentSchema: {} }),
      makeParams(),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_STATE');
  });

  it('returns 400 for invalid request body', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'validating',
      projectId: randomUUID(),
    } as never);

    const res = await POST(makeRequest({ errorDescription: '' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns SSE stream for valid correction request', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'validating',
      projectId: randomUUID(),
    } as never);

    const validSchema = {
      schemaVersion: '1.0',
      processNodeId: randomUUID(),
      interviewId: testInterviewId,
      steps: [
        {
          id: randomUUID(),
          label: 'Fixed step',
          type: 'step',
          sourceType: 'interview_discovered',
          sourceExchangeIds: [],
        },
      ],
      connections: [],
      metadata: {
        extractionMethod: 'llm_fallback',
        extractedAt: new Date().toISOString(),
        stepCount: 1,
        decisionPointCount: 0,
      },
    };

    mockStreamCorrected.mockImplementation(async function* () {
      yield JSON.stringify(validSchema);
    });

    mockGetSchema.mockResolvedValue({ id: randomUUID() } as never);
    mockUpdateSchema.mockResolvedValue({} as never);

    const res = await POST(
      makeRequest({ errorDescription: 'Fix the step', currentSchema: {} }),
      makeParams(),
    );

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');

    // Read stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let output = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }

    expect(output).toContain('event: message');
    expect(output).toContain('event: schema');
    expect(output).toContain('event: done');
  });
});
