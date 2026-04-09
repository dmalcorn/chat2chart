// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getInterviewTokenByToken: vi.fn(),
  getInterviewByTokenId: vi.fn(),
  getProjectById: vi.fn(),
  getInterviewExchangesByInterviewId: vi.fn(),
  createInterviewExchange: vi.fn(),
  getMaxSequenceNumber: vi.fn(),
}));

vi.mock('@/lib/interview/skill-loader', () => ({
  loadSkill: vi.fn(),
}));

vi.mock('@/lib/ai/prompts/prompt-assembler', () => ({
  assembleInterviewPrompt: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  resolveProvider: vi.fn(),
}));

import { POST } from './route';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getProjectById,
  getInterviewExchangesByInterviewId,
  createInterviewExchange,
  getMaxSequenceNumber,
} from '@/lib/db/queries';
import { loadSkill } from '@/lib/interview/skill-loader';
import { assembleInterviewPrompt } from '@/lib/ai/prompts/prompt-assembler';
import { resolveProvider } from '@/lib/ai';
import type { LLMProvider } from '@/lib/ai';

const mockGetToken = vi.mocked(getInterviewTokenByToken);
const mockGetInterview = vi.mocked(getInterviewByTokenId);
const mockGetProject = vi.mocked(getProjectById);
const mockGetExchanges = vi.mocked(getInterviewExchangesByInterviewId);
const mockCreateExchange = vi.mocked(createInterviewExchange);
const mockGetMaxSeq = vi.mocked(getMaxSequenceNumber);
const mockLoadSkill = vi.mocked(loadSkill);
const mockAssemblePrompt = vi.mocked(assembleInterviewPrompt);
const mockResolveProvider = vi.mocked(resolveProvider);

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

const mockTokenRow = {
  id: 'token-row-id',
  projectId: 'project-id',
  processNodeId: 'node-id',
  token: VALID_TOKEN,
  intervieweeName: 'Jane Doe',
  intervieweeRole: 'DPT' as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockInterview = {
  id: 'interview-id',
  tokenId: 'token-row-id',
  projectId: 'project-id',
  processNodeId: 'node-id',
  status: 'active' as const,
  llmProvider: null,
  sttProvider: null,
  startedAt: new Date(),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProject = {
  id: 'project-id',
  name: 'Test Project',
  description: null,
  skillName: 'federal-document-processing',
  defaultLlmProvider: 'anthropic',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeParams(token: string): Promise<{ token: string }> {
  return Promise.resolve({ token });
}

function makeRequest(token: string, body: unknown): Request {
  return new Request(`http://localhost/api/interview/${token}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(token: string, rawBody: string): Request {
  return new Request(`http://localhost/api/interview/${token}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });
}

function createMockProvider(tokens: string[]): LLMProvider {
  return {
    initialize: vi.fn(),
    sendMessage: vi.fn(),
    streamResponse: vi.fn(async function* () {
      for (const token of tokens) {
        yield token;
      }
    }),
    metadata: {
      providerName: 'test',
      modelName: 'test-model',
      modelVersion: '1.0',
      tokenLimits: { input: 100000, output: 4096 },
    },
  };
}

async function readSSEStream(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: string[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  // Parse SSE events from buffer
  const rawEvents = buffer.split('\n\n').filter((e) => e.trim());
  for (const raw of rawEvents) {
    events.push(raw);
  }
  return events;
}

function parseSSEEvent(raw: string): { event: string; data: unknown } {
  const lines = raw.split('\n');
  let event = '';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7);
    if (line.startsWith('data: ')) data = line.slice(6);
  }
  return { event, data: JSON.parse(data) };
}

function setupHappyPath(tokens: string[] = ['Hello', ' there']) {
  mockGetToken.mockResolvedValue(mockTokenRow);
  mockGetInterview.mockResolvedValue(mockInterview);
  mockGetProject.mockResolvedValue(mockProject);
  mockGetExchanges.mockResolvedValue([]);
  mockGetMaxSeq.mockResolvedValue(0);
  mockCreateExchange.mockResolvedValue({
    id: 'exchange-id',
    interviewId: 'interview-id',
    segmentId: 'segment-id',
    exchangeType: 'question',
    speaker: 'agent',
    content: tokens.join(''),
    isVerified: false,
    sequenceNumber: 2,
    createdAt: new Date(),
  });
  mockLoadSkill.mockResolvedValue({
    name: 'federal-document-processing',
    description: 'Test skill',
    persona: { identity: 'Test', communicationStyle: 'Test', principles: 'Test' },
    probeElements: 'Test probes',
    synthesisElements: 'Test elements',
    followUpStrategies: null,
    reflectiveSummaryTemplate: null,
    rawContent: 'raw',
  });
  mockAssemblePrompt.mockReturnValue('assembled system prompt');
  mockResolveProvider.mockResolvedValue(createMockProvider(tokens));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/interview/[token]/messages', () => {
  it('returns SSE stream with correct Content-Type for valid request', async () => {
    setupHappyPath();
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'I open the mail' }), {
      params: makeParams(VALID_TOKEN),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    // Consume stream to prevent leaks
    await readSSEStream(response);
  });

  it('SSE stream contains message events with content', async () => {
    setupHappyPath(['Hello there, what do you do first?']);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'I open the mail' }), {
      params: makeParams(VALID_TOKEN),
    });
    const events = await readSSEStream(response);
    const messageEvents = events.map(parseSSEEvent).filter((e) => e.event === 'message');
    expect(messageEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('SSE stream emits type event before message events for questions', async () => {
    setupHappyPath(['What do you do after opening the mail?']);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'I open the mail' }), {
      params: makeParams(VALID_TOKEN),
    });
    const events = await readSSEStream(response);
    const parsed = events.map(parseSSEEvent);
    const typeEvent = parsed.find((e) => e.event === 'type');
    expect(typeEvent).toBeDefined();
    expect((typeEvent!.data as { exchangeType: string }).exchangeType).toBe('question');
  });

  it('SSE stream emits type event with reflective_summary and strips marker from content', async () => {
    setupHappyPath(['[REFLECTIVE_SUMMARY]\nSo you sort the mail first into categories.']);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'I sort the mail' }), {
      params: makeParams(VALID_TOKEN),
    });
    const events = await readSSEStream(response);
    const parsed = events.map(parseSSEEvent);
    const typeEvent = parsed.find((e) => e.event === 'type');
    expect(typeEvent).toBeDefined();
    expect((typeEvent!.data as { exchangeType: string }).exchangeType).toBe('reflective_summary');

    // Marker should not appear in message content
    const messageEvents = parsed.filter((e) => e.event === 'message');
    for (const msg of messageEvents) {
      expect((msg.data as { content: string }).content).not.toContain('[REFLECTIVE_SUMMARY]');
    }
  });

  it('SSE stream ends with done event containing interviewExchangeId and segmentId', async () => {
    setupHappyPath();
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'I open the mail' }), {
      params: makeParams(VALID_TOKEN),
    });
    const events = await readSSEStream(response);
    const doneEvents = events.map(parseSSEEvent).filter((e) => e.event === 'done');
    expect(doneEvents.length).toBe(1);
    const doneData = doneEvents[0].data as {
      interviewExchangeId: string;
      segmentId: string;
      exchangeType: string;
    };
    expect(doneData.interviewExchangeId).toBe('exchange-id');
    expect(doneData.segmentId).toBeDefined();
    expect(doneData.exchangeType).toBe('question');
  });

  it('persists user message as exchange with speaker interviewee before LLM call', async () => {
    setupHappyPath();
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'I sort the mail' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);

    // First call should be the user message (before stream)
    expect(mockCreateExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewId: 'interview-id',
        exchangeType: 'response',
        speaker: 'interviewee',
        content: 'I sort the mail',
        sequenceNumber: 1,
      }),
    );
  });

  it('persists agent response as exchange with speaker agent after stream completes', async () => {
    setupHappyPath(['Hello', ' there']);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);

    // Second call should be the agent response (after stream)
    expect(mockCreateExchange).toHaveBeenCalledTimes(2);
    expect(mockCreateExchange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        interviewId: 'interview-id',
        speaker: 'agent',
        content: 'Hello there',
        sequenceNumber: 2,
      }),
    );
  });

  it('detects reflective_summary exchange type from marker and strips it from persisted content', async () => {
    setupHappyPath(['[REFLECTIVE_SUMMARY]\n', 'So you sort the mail first.']);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);

    expect(mockCreateExchange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exchangeType: 'reflective_summary',
        content: 'So you sort the mail first.',
      }),
    );
  });

  it('defaults to question exchange type when no marker present', async () => {
    setupHappyPath(['What do you do next?']);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);

    expect(mockCreateExchange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exchangeType: 'question',
      }),
    );
  });

  it('returns 404 for invalid token format', async () => {
    const response = await POST(makeRequest('not-a-uuid', { message: 'hello' }), {
      params: makeParams('not-a-uuid'),
    });
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 404 for nonexistent token', async () => {
    mockGetToken.mockResolvedValue(null);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'hello' }), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 for non-active interview', async () => {
    mockGetToken.mockResolvedValue(mockTokenRow);
    mockGetInterview.mockResolvedValue({ ...mockInterview, status: 'pending' });
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'hello' }), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INTERVIEW_NOT_ACTIVE');
  });

  it('returns 400 for empty message body', async () => {
    mockGetToken.mockResolvedValue(mockTokenRow);
    mockGetInterview.mockResolvedValue(mockInterview);
    const response = await POST(makeRequest(VALID_TOKEN, { message: '' }), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing message field', async () => {
    mockGetToken.mockResolvedValue(mockTokenRow);
    mockGetInterview.mockResolvedValue(mockInterview);
    const response = await POST(makeRequest(VALID_TOKEN, {}), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed JSON body instead of 500', async () => {
    mockGetToken.mockResolvedValue(mockTokenRow);
    mockGetInterview.mockResolvedValue(mockInterview);
    const response = await POST(makeRawRequest(VALID_TOKEN, 'not-json{{{'), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('valid JSON');
  });

  it('emits SSE error event on LLM streaming failure', async () => {
    setupHappyPath();
    const failingProvider = createMockProvider([]);
    failingProvider.streamResponse = vi.fn(async function* () {
      throw new Error('LLM connection failed');
    });
    mockResolveProvider.mockResolvedValue(failingProvider);

    const response = await POST(makeRequest(VALID_TOKEN, { message: 'hello' }), {
      params: makeParams(VALID_TOKEN),
    });
    const events = await readSSEStream(response);
    const errorEvents = events.map(parseSSEEvent).filter((e) => e.event === 'error');
    expect(errorEvents.length).toBe(1);
    const errorData = errorEvents[0].data as { message: string; code: string };
    expect(errorData.code).toBe('LLM_ERROR');
    expect(errorData.message).toBe('The AI agent is temporarily unavailable.');
  });

  it('returns 500 for unexpected errors', async () => {
    mockGetToken.mockRejectedValue(new Error('DB exploded'));
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'hello' }), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('loads skill using project skillName', async () => {
    setupHappyPath();
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);
    expect(mockLoadSkill).toHaveBeenCalledWith('federal-document-processing');
  });

  it('assembles prompt from loaded skill', async () => {
    setupHappyPath();
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);
    expect(mockAssemblePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'federal-document-processing' }),
    );
  });

  it('resolves provider with project ID and interview_agent skill', async () => {
    setupHappyPath();
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    await readSSEStream(response);
    expect(mockResolveProvider).toHaveBeenCalledWith('project-id', 'interview_agent');
  });

  it('returns 400 when no interview exists for token', async () => {
    mockGetToken.mockResolvedValue(mockTokenRow);
    mockGetInterview.mockResolvedValue(null);
    const response = await POST(makeRequest(VALID_TOKEN, { message: 'hello' }), {
      params: makeParams(VALID_TOKEN),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INTERVIEW_NOT_ACTIVE');
  });

  it('retries on sequence number conflict', async () => {
    setupHappyPath(['What next?']);
    let callCount = 0;
    mockCreateExchange.mockImplementation(async (data) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('uq_interview_exchanges_sequence');
      }
      return {
        id: `exchange-${callCount}`,
        interviewId: data.interviewId,
        segmentId: data.segmentId,
        exchangeType: data.exchangeType as 'question',
        speaker: data.speaker as 'interviewee',
        content: data.content,
        isVerified: false,
        sequenceNumber: data.sequenceNumber,
        createdAt: new Date(),
      };
    });
    mockGetMaxSeq.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const response = await POST(makeRequest(VALID_TOKEN, { message: 'test' }), {
      params: makeParams(VALID_TOKEN),
    });
    const events = await readSSEStream(response);
    const doneEvents = events.map(parseSSEEvent).filter((e) => e.event === 'done');
    expect(doneEvents.length).toBe(1);
    expect(mockGetMaxSeq).toHaveBeenCalledTimes(2);
  });
});
