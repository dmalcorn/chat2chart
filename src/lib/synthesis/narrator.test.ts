import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('@/lib/ai/provider-registry', () => ({
  resolveProvider: vi.fn(),
}));

vi.mock('@/lib/ai/prompts/synthesis/narrate-template', () => ({
  buildNarratePrompt: vi.fn().mockReturnValue('mock narrate prompt'),
}));

vi.mock('@/lib/interview/skill-loader', () => ({
  loadSkill: vi.fn().mockResolvedValue({
    name: 'test-skill',
    synthesisElements: 'test domain context',
  }),
}));

vi.mock('@/lib/db/queries', () => ({
  getProjectById: vi.fn().mockResolvedValue({ skillName: 'test-skill' }),
}));

import { narrateDivergences, SynthesisNarrationError } from './narrator';
import { resolveProvider } from '@/lib/ai/provider-registry';
import type { LLMProvider } from '@/lib/ai/provider';

const mockResolveProvider = vi.mocked(resolveProvider);

const PROJECT_ID = randomUUID();
const NODE_ID = randomUUID();

function makeValidNarrationResponse() {
  const divId = randomUUID();
  const stepId = randomUUID();
  return JSON.stringify({
    divergences: [
      {
        id: divId,
        stepId,
        divergenceType: 'genuinely_unique',
        intervieweeIds: [randomUUID()],
        confidence: 0.8,
        explanation: 'Janet Park performs a manual quality check that other interviewees do not.',
        sourceType: 'synthesis_inferred',
      },
    ],
    summary:
      'The interviewed workers follow a largely similar process, with one notable divergence: Janet Park performs an additional quality check step that is not part of the standard workflow described by other interviewees.',
  });
}

function makeNarrateInput() {
  const interviewId = randomUUID();
  return {
    projectId: PROJECT_ID,
    processNodeId: NODE_ID,
    synthesisVersion: 1,
    classificationResult: {
      divergences: [
        {
          id: randomUUID(),
          stepId: randomUUID(),
          divergenceType: 'genuinely_unique' as const,
          intervieweeIds: [interviewId],
          confidence: 0.8,
          explanation: '',
          sourceType: 'synthesis_inferred' as const,
        },
      ],
      implicitSteps: [],
      processedAt: new Date().toISOString(),
    },
    individualSchemas: [
      {
        interviewId,
        intervieweeName: 'Janet Park',
        intervieweeRole: 'Mail Clerk' as string | null,
        schemaJson: {
          schemaVersion: '1.0',
          processNodeId: randomUUID(),
          interviewId,
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
    matchResults: [
      {
        matchType: 'unmatched' as const,
        confidence: 0.7,
        rationale: 'Unique step',
        sourceSteps: [
          {
            interviewId,
            intervieweeName: 'Janet Park',
            stepId: randomUUID(),
            stepLabel: 'Quality check',
          },
        ],
        sourceType: 'synthesis_inferred' as const,
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

describe('narrateDivergences', () => {
  it('calls LLM with correct temperature (0.4) and output format', async () => {
    const mockProvider = createMockProvider(makeValidNarrationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    await narrateDivergences(makeNarrateInput());

    expect(mockProvider.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ temperature: 0.4 }),
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

  it('populates explanation on each divergence annotation', async () => {
    const mockProvider = createMockProvider(makeValidNarrationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await narrateDivergences(makeNarrateInput());

    for (const div of result.divergences) {
      expect(div.explanation).toBeTruthy();
      expect(div.explanation.length).toBeGreaterThan(0);
    }
  });

  it('returns a narrative summary string', async () => {
    const mockProvider = createMockProvider(makeValidNarrationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await narrateDivergences(makeNarrateInput());

    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('retries once on Zod validation failure', async () => {
    const invalidResponse = JSON.stringify({ invalid: 'data' });
    const validResponse = makeValidNarrationResponse();
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

    const result = await narrateDivergences(makeNarrateInput());

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(result.divergences).toHaveLength(1);
  });

  it('throws on second validation failure', async () => {
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

    await expect(narrateDivergences(makeNarrateInput())).rejects.toThrow(SynthesisNarrationError);
  });

  it('all returned divergences have sourceType synthesis_inferred', async () => {
    const mockProvider = createMockProvider(makeValidNarrationResponse());
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await narrateDivergences(makeNarrateInput());

    for (const div of result.divergences) {
      expect(div.sourceType).toBe('synthesis_inferred');
    }
  });
});
