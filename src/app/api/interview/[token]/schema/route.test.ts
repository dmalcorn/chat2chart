// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

// Mock dependencies
vi.mock('@/lib/interview/token', () => ({
  validateTokenFormat: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  getInterviewTokenByToken: vi.fn(),
  getInterviewByTokenId: vi.fn(),
  getVerifiedExchangesByInterviewId: vi.fn(),
  getIndividualProcessSchemaByInterviewId: vi.fn(),
  createIndividualProcessSchema: vi.fn(),
  updateIndividualProcessSchemaValidation: vi.fn(),
}));

vi.mock('@/lib/interview/schema-extractor', () => ({
  extractProcessSchema: vi.fn(),
}));

vi.mock('@/lib/interview/individual-mermaid-generator', () => ({
  generateIndividualMermaid: vi.fn(),
  generateTextAlternative: vi.fn(),
}));

vi.mock('@/lib/synthesis/state-machine', () => ({
  transitionInterview: vi.fn(),
}));

import { GET, POST } from './route';
import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getVerifiedExchangesByInterviewId,
  getIndividualProcessSchemaByInterviewId,
  createIndividualProcessSchema,
  updateIndividualProcessSchemaValidation,
} from '@/lib/db/queries';
import { extractProcessSchema } from '@/lib/interview/schema-extractor';
import {
  generateIndividualMermaid,
  generateTextAlternative,
} from '@/lib/interview/individual-mermaid-generator';
import { transitionInterview } from '@/lib/synthesis/state-machine';

const mockValidateToken = vi.mocked(validateTokenFormat);
const mockGetToken = vi.mocked(getInterviewTokenByToken);
const mockGetInterview = vi.mocked(getInterviewByTokenId);
const mockGetVerified = vi.mocked(getVerifiedExchangesByInterviewId);
const mockGetSchema = vi.mocked(getIndividualProcessSchemaByInterviewId);
const mockCreateSchema = vi.mocked(createIndividualProcessSchema);
const mockUpdateValidation = vi.mocked(updateIndividualProcessSchemaValidation);
const mockExtract = vi.mocked(extractProcessSchema);
const mockGenMermaid = vi.mocked(generateIndividualMermaid);
const mockGenText = vi.mocked(generateTextAlternative);
const mockTransition = vi.mocked(transitionInterview);

const testToken = randomUUID();
const testTokenId = randomUUID();
const testInterviewId = randomUUID();
const testProcessNodeId = randomUUID();
const testProjectId = randomUUID();

function makeParams(token = testToken) {
  return { params: Promise.resolve({ token }) };
}

function makeRequest(method = 'GET') {
  return new Request('http://localhost/api/interview/test/schema', { method });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/interview/[token]/schema', () => {
  it('returns 404 for invalid token format', async () => {
    mockValidateToken.mockReturnValue(false);

    const res = await GET(makeRequest(), makeParams('bad-token' as ReturnType<typeof randomUUID>));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 404 when token not found', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 404 for active interview (schema not available)', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'active',
      processNodeId: testProcessNodeId,
      projectId: testProjectId,
    } as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('SCHEMA_NOT_AVAILABLE');
  });

  it('returns existing schema for validating interview', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'validating',
      processNodeId: testProcessNodeId,
      projectId: testProjectId,
    } as never);
    mockGetSchema.mockResolvedValue({
      id: randomUUID(),
      schemaJson: { steps: [], connections: [], metadata: {} },
      mermaidDefinition: 'flowchart TD',
      validationStatus: 'pending',
    } as never);
    mockGenText.mockReturnValue('text alt');

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.mermaidDefinition).toBe('flowchart TD');
    expect(body.data.textAlternative).toBe('text alt');
    expect(body.data.validationStatus).toBe('pending');
  });

  it('returns existing schema for captured interview', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'captured',
      processNodeId: testProcessNodeId,
      projectId: testProjectId,
    } as never);
    mockGetSchema.mockResolvedValue({
      id: randomUUID(),
      schemaJson: { steps: [] },
      mermaidDefinition: 'flowchart TD',
      validationStatus: 'validated',
    } as never);
    mockGenText.mockReturnValue('text');

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.validationStatus).toBe('validated');
  });

  it('triggers extraction for completed interview without schema', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'completed',
      processNodeId: testProcessNodeId,
      projectId: testProjectId,
    } as never);
    mockGetSchema.mockResolvedValue(null);
    mockGetVerified.mockResolvedValue([
      { id: randomUUID(), segmentId: randomUUID(), content: 'I process orders', sequenceNumber: 1 },
    ] as never);

    const mockSchemaResult = {
      schemaVersion: '1.0',
      processNodeId: testProcessNodeId,
      interviewId: testInterviewId,
      steps: [
        {
          id: randomUUID(),
          label: 'Process orders',
          type: 'step',
          sourceType: 'interview_discovered',
          sourceExchangeIds: [],
        },
      ],
      connections: [],
      metadata: {
        extractionMethod: 'programmatic',
        extractedAt: new Date().toISOString(),
        stepCount: 1,
        decisionPointCount: 0,
      },
    };
    mockExtract.mockResolvedValue(mockSchemaResult as never);
    mockGenMermaid.mockReturnValue('flowchart TD\n  s1("Process orders")');
    mockGenText.mockReturnValue('Steps:\n  1. Process orders');
    mockCreateSchema.mockResolvedValue({} as never);
    mockTransition.mockResolvedValue({} as never);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.schema).toEqual(mockSchemaResult);
    expect(mockExtract).toHaveBeenCalled();
    expect(mockCreateSchema).toHaveBeenCalled();
    expect(mockTransition).toHaveBeenCalledWith(testInterviewId, 'validating');
  });
});

describe('POST /api/interview/[token]/schema', () => {
  it('returns 404 for invalid token', async () => {
    mockValidateToken.mockReturnValue(false);

    const res = await POST(makeRequest('POST'), makeParams('bad' as ReturnType<typeof randomUUID>));
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
    } as never);

    const res = await POST(makeRequest('POST'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_STATE');
  });

  it('confirms validation and transitions to captured', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue({ id: testTokenId } as never);
    mockGetInterview.mockResolvedValue({
      id: testInterviewId,
      status: 'validating',
    } as never);
    mockGetSchema.mockResolvedValue({ id: randomUUID() } as never);
    mockUpdateValidation.mockResolvedValue({} as never);
    mockTransition.mockResolvedValue({} as never);

    const res = await POST(makeRequest('POST'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.interviewState).toBe('captured');
    expect(body.data.validationStatus).toBe('validated');
    expect(mockUpdateValidation).toHaveBeenCalledWith(expect.any(String), 'validated');
    expect(mockTransition).toHaveBeenCalledWith(testInterviewId, 'captured');
  });

  it('returns 404 when token not found', async () => {
    mockValidateToken.mockReturnValue(true);
    mockGetToken.mockResolvedValue(null);

    const res = await POST(makeRequest('POST'), makeParams());

    expect(res.status).toBe(404);
  });
});
