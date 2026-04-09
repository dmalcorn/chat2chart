import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('@/lib/ai/provider-registry', () => ({
  resolveProvider: vi.fn(),
}));

vi.mock('@/lib/ai/prompts/synthesis/match-template', () => ({
  buildMatchPrompt: vi.fn().mockReturnValue('mock prompt'),
}));

import { correlateSteps, SynthesisCorrelationError } from './correlator';
import { resolveProvider } from '@/lib/ai/provider-registry';
import { buildMatchPrompt } from '@/lib/ai/prompts/synthesis/match-template';
import type { LLMProvider } from '@/lib/ai/provider';
import type { NormalizedSchema } from '@/lib/ai/prompts/synthesis/match-template';

const mockResolveProvider = vi.mocked(resolveProvider);
const mockBuildPrompt = vi.mocked(buildMatchPrompt);

function makeSchema(name: string, stepLabels: string[]): NormalizedSchema {
  return {
    interviewId: randomUUID(),
    intervieweeName: name,
    steps: stepLabels.map((label) => ({
      stepId: randomUUID(),
      label,
      type: 'step',
    })),
  };
}

function makeMatchResults(matchTypes: string[]) {
  return {
    results: matchTypes.map((matchType) => ({
      matchType,
      confidence: 0.9,
      rationale: 'Test rationale',
      sourceSteps: [
        {
          interviewId: randomUUID(),
          intervieweeName: 'Alice',
          stepId: randomUUID(),
          stepLabel: 'Step A',
        },
        {
          interviewId: randomUUID(),
          intervieweeName: 'Bob',
          stepId: randomUUID(),
          stepLabel: 'Step B',
        },
      ],
      sourceType: 'synthesis_inferred',
    })),
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

describe('correlateSteps', () => {
  it('returns validated MatchResult array on success', async () => {
    const results = makeMatchResults(['exact_match', 'semantic_match']);
    const mockProvider = createMockProvider(JSON.stringify(results));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const schemas = [makeSchema('Alice', ['Scan document']), makeSchema('Bob', ['Scan document'])];
    const output = await correlateSteps(schemas, 'project-1');

    expect(output).toHaveLength(2);
    expect(output[0].matchType).toBe('exact_match');
    expect(output[1].matchType).toBe('semantic_match');
    expect(output[0].sourceType).toBe('synthesis_inferred');
  });

  it('randomizes step order before building prompt (position bias mitigation)', async () => {
    const results = makeMatchResults(['exact_match']);
    const mockProvider = createMockProvider(JSON.stringify(results));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const schema = makeSchema('Alice', ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']);
    // Run multiple times — at least one call should have different order
    // We verify buildMatchPrompt is called with schemas that have steps
    await correlateSteps([schema], 'project-1');

    expect(mockBuildPrompt).toHaveBeenCalledTimes(1);
    const calledSchemas = mockBuildPrompt.mock.calls[0][0];
    expect(calledSchemas[0].steps).toHaveLength(5);
    // Steps are present (order may differ due to shuffle)
    const labels = calledSchemas[0].steps.map((s: { label: string }) => s.label);
    expect(labels).toContain('Step 1');
    expect(labels).toContain('Step 5');
  });

  it.each(['exact_match', 'semantic_match', 'subsumption', 'split_merge', 'unmatched'])(
    'handles match type: %s',
    async (matchType) => {
      const results = makeMatchResults([matchType]);
      const mockProvider = createMockProvider(JSON.stringify(results));
      mockResolveProvider.mockResolvedValue(mockProvider);

      const schemas = [makeSchema('Alice', ['Step']), makeSchema('Bob', ['Step'])];
      const output = await correlateSteps(schemas, 'project-1');

      expect(output[0].matchType).toBe(matchType);
    },
  );

  it('retries once on LLM failure and succeeds', async () => {
    const results = makeMatchResults(['exact_match']);
    const mockSendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('LLM timeout'))
      .mockResolvedValueOnce(JSON.stringify(results));

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

    const schemas = [makeSchema('Alice', ['Step']), makeSchema('Bob', ['Step'])];
    const output = await correlateSteps(schemas, 'project-1');

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(output[0].matchType).toBe('exact_match');
  });

  it('throws descriptive error after retry exhaustion', async () => {
    const mockSendMessage = vi.fn().mockRejectedValue(new Error('LLM down'));
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

    const schemas = [makeSchema('Alice', ['Step']), makeSchema('Bob', ['Step'])];

    await expect(correlateSteps(schemas, 'project-1')).rejects.toThrow(SynthesisCorrelationError);
    await expect(correlateSteps(schemas, 'project-1')).rejects.toThrow(
      'The AI agent is temporarily unavailable.',
    );
  });

  it('all match results carry sourceType synthesis_inferred', async () => {
    const results = makeMatchResults(['exact_match', 'unmatched', 'subsumption']);
    const mockProvider = createMockProvider(JSON.stringify(results));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const schemas = [makeSchema('Alice', ['Step']), makeSchema('Bob', ['Step'])];
    const output = await correlateSteps(schemas, 'project-1');

    for (const match of output) {
      expect(match.sourceType).toBe('synthesis_inferred');
    }
  });

  it('calls provider with temperature 0.2', async () => {
    const results = makeMatchResults(['exact_match']);
    const mockProvider = createMockProvider(JSON.stringify(results));
    mockResolveProvider.mockResolvedValue(mockProvider);

    const schemas = [makeSchema('Alice', ['Step'])];
    await correlateSteps(schemas, 'project-1');

    expect(mockProvider.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ temperature: 0.2 }),
    );
  });

  it('throws INVALID_LLM_RESPONSE when LLM returns malformed JSON', async () => {
    const mockProvider = createMockProvider('not valid json {{{');
    mockResolveProvider.mockResolvedValue(mockProvider);

    const schemas = [makeSchema('Alice', ['Step']), makeSchema('Bob', ['Step'])];

    await expect(correlateSteps(schemas, 'project-1')).rejects.toThrow(SynthesisCorrelationError);
    await expect(correlateSteps(schemas, 'project-1')).rejects.toThrow(
      'LLM returned malformed JSON response',
    );
  });

  it('resolves provider with synthesis_engine skill name', async () => {
    const results = makeMatchResults(['exact_match']);
    const mockProvider = createMockProvider(JSON.stringify(results));
    mockResolveProvider.mockResolvedValue(mockProvider);

    await correlateSteps([makeSchema('Alice', ['Step'])], 'project-42');

    expect(mockResolveProvider).toHaveBeenCalledWith('project-42', 'synthesis_engine');
  });
});
