import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('@/lib/ai/provider-registry', () => ({
  resolveProvider: vi.fn(),
}));

vi.mock('@/lib/ai/prompts/synthesis/classify-template', () => ({
  buildClassifyPrompt: vi.fn().mockReturnValue('mock classify prompt'),
}));

vi.mock('@/lib/interview/skill-loader', () => ({
  loadSkill: vi.fn().mockResolvedValue({
    name: 'test-skill',
    synthesisElements: 'test domain context',
  }),
}));

vi.mock('@/lib/db/queries', () => ({
  getProjectById: vi.fn().mockResolvedValue({ skillName: 'test-skill' }),
  createSynthesisCheckpoint: vi.fn().mockResolvedValue({ id: 'checkpoint-1' }),
}));

import { classifyDivergences, SynthesisClassificationError } from './divergence';
import { resolveProvider } from '@/lib/ai/provider-registry';
import { createSynthesisCheckpoint } from '@/lib/db/queries';
import type { LLMProvider } from '@/lib/ai/provider';

const mockResolveProvider = vi.mocked(resolveProvider);
const mockCreateCheckpoint = vi.mocked(createSynthesisCheckpoint);

const PROJECT_ID = randomUUID();
const NODE_ID = randomUUID();

function makeValidClassificationResponse() {
  return JSON.stringify({
    divergences: [
      {
        id: randomUUID(),
        stepId: randomUUID(),
        divergenceType: 'genuinely_unique',
        intervieweeIds: [randomUUID()],
        confidence: 0.8,
        explanation: '',
        sourceType: 'synthesis_inferred',
      },
    ],
    implicitSteps: [],
    processedAt: new Date().toISOString(),
  });
}

function makeClassifyInput() {
  return {
    projectId: PROJECT_ID,
    processNodeId: NODE_ID,
    synthesisVersion: 1,
    matchResults: [
      {
        matchType: 'unmatched' as const,
        confidence: 0.7,
        rationale: 'Unique step',
        sourceSteps: [
          {
            interviewId: randomUUID(),
            intervieweeName: 'Alice',
            stepId: randomUUID(),
            stepLabel: 'Quality check',
          },
        ],
        sourceType: 'synthesis_inferred' as const,
      },
    ],
    individualSchemas: [
      {
        interviewId: randomUUID(),
        intervieweeName: 'Alice',
        schemaJson: {
          schemaVersion: '1.0',
          processNodeId: randomUUID(),
          interviewId: randomUUID(),
          steps: [
            {
              id: randomUUID(),
              label: 'Quality check',
              type: 'step' as const,
              sourceType: 'interview_discovered' as const,
              sourceExchangeIds: [],
            },
          ],
          connections: [],
          metadata: {
            extractionMethod: 'programmatic' as const,
            extractedAt: new Date().toISOString(),
            stepCount: 1,
            decisionPointCount: 0,
          },
        },
      },
    ],
  };
}

function createMockProvider(response: string): LLMProvider {
  return {
    sendMessage: vi.fn().mockResolvedValue(response),
    streamResponse: vi.fn(),
    initialize: vi.fn(),
    metadata: {
      providerName: 'anthropic',
      modelName: 'claude-sonnet-4',
      modelVersion: '2025-05-14',
      tokenLimits: { input: 200000, output: 8192 },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('classifyDivergences', () => {
  it('calls LLM with correct temperature (0.1) and output format', async () => {
    const mockProvider = createMockProvider(makeValidClassificationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    await classifyDivergences(makeClassifyInput());

    expect(mockProvider.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ temperature: 0.1 }),
    );
    expect(mockProvider.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({
        outputFormat: expect.objectContaining({
          type: 'json_schema',
        }),
      }),
    );
  });

  it('persists checkpoint to synthesis_checkpoints with stage classify', async () => {
    const mockProvider = createMockProvider(makeValidClassificationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    await classifyDivergences(makeClassifyInput());

    expect(mockCreateCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        processNodeId: NODE_ID,
        synthesisVersion: 1,
        stage: 'classify',
      }),
    );
  });

  it('retries once on Zod validation failure', async () => {
    const invalidResponse = JSON.stringify({ invalid: 'data' });
    const validResponse = makeValidClassificationResponse();
    const mockSendMessage = vi
      .fn()
      .mockResolvedValueOnce(invalidResponse)
      .mockResolvedValueOnce(validResponse);
    const mockProvider: LLMProvider = {
      sendMessage: mockSendMessage,
      streamResponse: vi.fn(),
      initialize: vi.fn(),
      metadata: {
        providerName: 'anthropic',
        modelName: 'claude-sonnet-4',
        modelVersion: '2025-05-14',
        tokenLimits: { input: 200000, output: 8192 },
      },
    };
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await classifyDivergences(makeClassifyInput());

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(result.divergences).toHaveLength(1);
  });

  it('throws on second validation failure (no infinite retry)', async () => {
    const invalidResponse = JSON.stringify({ invalid: 'data' });
    const mockSendMessage = vi.fn().mockResolvedValue(invalidResponse);
    const mockProvider: LLMProvider = {
      sendMessage: mockSendMessage,
      streamResponse: vi.fn(),
      initialize: vi.fn(),
      metadata: {
        providerName: 'anthropic',
        modelName: 'claude-sonnet-4',
        modelVersion: '2025-05-14',
        tokenLimits: { input: 200000, output: 8192 },
      },
    };
    mockResolveProvider.mockResolvedValue(mockProvider);

    await expect(classifyDivergences(makeClassifyInput())).rejects.toThrow(
      SynthesisClassificationError,
    );
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });

  it('all returned elements have sourceType synthesis_inferred', async () => {
    const mockProvider = createMockProvider(makeValidClassificationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await classifyDivergences(makeClassifyInput());

    for (const div of result.divergences) {
      expect(div.sourceType).toBe('synthesis_inferred');
    }
    for (const step of result.implicitSteps) {
      expect(step.sourceType).toBe('synthesis_inferred');
    }
  });

  it('resolves provider with synthesis_engine skill name', async () => {
    const mockProvider = createMockProvider(makeValidClassificationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    await classifyDivergences(makeClassifyInput());

    expect(mockResolveProvider).toHaveBeenCalledWith(PROJECT_ID, 'synthesis_engine');
  });
});
