// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('@/lib/ai/provider-registry', () => ({
  resolveProvider: vi.fn(),
}));

vi.mock('@/lib/ai/prompts/correction-template', () => ({
  buildCorrectionPrompt: vi.fn(() => 'mock correction prompt'),
}));

import { streamCorrectedSchema, getCorrectedSchema } from './correction-agent';
import { resolveProvider } from '@/lib/ai/provider-registry';
import { buildCorrectionPrompt } from '@/lib/ai/prompts/correction-template';
import type { LLMProvider } from '@/lib/ai/provider';

const mockResolveProvider = vi.mocked(resolveProvider);
const mockBuildPrompt = vi.mocked(buildCorrectionPrompt);

function makeValidSchema() {
  return {
    schemaVersion: '1.0',
    processNodeId: randomUUID(),
    interviewId: randomUUID(),
    steps: [
      {
        id: randomUUID(),
        label: 'Process orders',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [randomUUID()],
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
}

function createMockProvider(response: string): LLMProvider {
  return {
    initialize: vi.fn(),
    sendMessage: vi.fn(async () => response),
    streamResponse: vi.fn(async function* () {
      yield response;
    }),
    metadata: {
      providerName: 'test',
      modelName: 'test',
      modelVersion: '1.0',
      tokenLimits: { input: 100000, output: 4096 },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('streamCorrectedSchema', () => {
  it('calls provider with assembled prompt', async () => {
    const validSchema = makeValidSchema();
    const mockProvider = createMockProvider(JSON.stringify(validSchema));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const tokens: string[] = [];
    for await (const token of streamCorrectedSchema({
      currentSchema: { steps: [] },
      errorDescription: 'Fix the first step',
      projectId: randomUUID(),
    })) {
      tokens.push(token);
    }

    expect(mockResolveProvider).toHaveBeenCalledWith(expect.any(String), 'diagram_correction');
    expect(mockProvider.streamResponse).toHaveBeenCalled();
    expect(mockBuildPrompt).toHaveBeenCalled();
  });

  it('yields streamed tokens', async () => {
    const validSchema = makeValidSchema();
    const mockProvider = createMockProvider(JSON.stringify(validSchema));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const tokens: string[] = [];
    for await (const token of streamCorrectedSchema({
      currentSchema: {},
      errorDescription: 'Fix step',
      projectId: randomUUID(),
    })) {
      tokens.push(token);
    }

    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe('getCorrectedSchema', () => {
  it('returns validated schema on success', async () => {
    const validSchema = makeValidSchema();
    const mockProvider = createMockProvider(JSON.stringify(validSchema));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await getCorrectedSchema({
      currentSchema: {},
      errorDescription: 'Fix the step',
      projectId: randomUUID(),
    });

    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).schemaVersion).toBe('1.0');
  });

  it('retries once on Zod validation failure', async () => {
    const validSchema = makeValidSchema();
    const mockProvider: LLMProvider = {
      initialize: vi.fn(),
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce('{ invalid }')
        .mockResolvedValueOnce(JSON.stringify(validSchema)),
      streamResponse: vi.fn(async function* () {
        yield '';
      }),
      metadata: {
        providerName: 'test',
        modelName: 'test',
        modelVersion: '1.0',
        tokenLimits: { input: 100000, output: 4096 },
      },
    };
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await getCorrectedSchema({
      currentSchema: {},
      errorDescription: 'Fix step',
      projectId: randomUUID(),
    });

    expect(mockProvider.sendMessage).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });

  it('throws CorrectionValidationError after retry failure', async () => {
    const mockProvider = createMockProvider('{ invalid json }');
    mockResolveProvider.mockResolvedValue(mockProvider);

    await expect(
      getCorrectedSchema({
        currentSchema: {},
        errorDescription: 'Fix step',
        projectId: randomUUID(),
      }),
    ).rejects.toThrow();
  });
});
