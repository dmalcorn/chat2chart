// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

// Mock provider-registry
vi.mock('@/lib/ai/provider-registry', () => ({
  resolveProvider: vi.fn(),
}));

import {
  extractProgrammatic,
  runQualityGate,
  extractViaLlm,
  extractProcessSchema,
  type VerifiedSummary,
  type ExtractionContext,
} from './schema-extractor';
import { individualProcessSchemaSchema } from '@/lib/schema/workflow';
import { resolveProvider } from '@/lib/ai/provider-registry';
import type { LLMProvider } from '@/lib/ai/provider';

const mockResolveProvider = vi.mocked(resolveProvider);

function makeSummary(content: string, index: number): VerifiedSummary {
  return {
    exchangeId: randomUUID(),
    segmentId: randomUUID(),
    content,
    sequenceNumber: index,
  };
}

function makeContext(): ExtractionContext {
  return {
    interviewId: randomUUID(),
    processNodeId: randomUUID(),
    projectId: randomUUID(),
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
      modelName: 'test-model',
      modelVersion: '1.0',
      tokenLimits: { input: 100000, output: 4096 },
    },
  };
}

describe('extractProgrammatic', () => {
  it('produces a valid schema from sample summaries', () => {
    const summaries = [
      makeSummary('First I scan the documents and sort the incoming mail', 1),
      makeSummary('Then I review the budget request and approve the expenses', 2),
    ];
    const context = makeContext();

    const result = extractProgrammatic(summaries, context);
    const validation = individualProcessSchemaSchema.safeParse(result);

    expect(validation.success).toBe(true);
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.metadata.extractionMethod).toBe('programmatic');
  });

  it('detects decision points from conditional language', () => {
    const summaries = [
      makeSummary('I check if the document is urgent', 1),
      makeSummary('If it is urgent, I flag it immediately', 2),
    ];
    const context = makeContext();

    const result = extractProgrammatic(summaries, context);

    expect(result.metadata.decisionPointCount).toBeGreaterThanOrEqual(1);
    expect(result.steps.some((s) => s.type === 'decision')).toBe(true);
  });

  it('sets sourceType to interview_discovered on all steps', () => {
    const summaries = [makeSummary('I process the orders', 1)];
    const context = makeContext();

    const result = extractProgrammatic(summaries, context);

    for (const step of result.steps) {
      expect(step.sourceType).toBe('interview_discovered');
    }
  });

  it('populates sourceExchangeIds with segment IDs', () => {
    const summaries = [makeSummary('I review the reports', 1)];
    const context = makeContext();

    const result = extractProgrammatic(summaries, context);

    for (const step of result.steps) {
      expect(step.sourceExchangeIds.length).toBeGreaterThanOrEqual(1);
      expect(step.sourceExchangeIds[0]).toBe(summaries[0].segmentId);
    }
  });

  it('builds sequential connections', () => {
    const summaries = [
      makeSummary('I open the envelope and read the letter', 1),
      makeSummary('Then I file the document', 2),
    ];
    const context = makeContext();

    const result = extractProgrammatic(summaries, context);

    expect(result.connections.length).toBeGreaterThanOrEqual(1);
  });

  it('uses compromise NLP for extraction', () => {
    const summaries = [makeSummary('I scan the documents and sort the mail', 1)];
    const context = makeContext();

    const result = extractProgrammatic(summaries, context);

    // compromise should extract verb-object pairs like "scan the documents", "sort the mail"
    const labels = result.steps.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes('scan') || l.includes('sort'))).toBe(true);
  });
});

describe('runQualityGate', () => {
  it('passes for well-formed extraction', () => {
    const summaries = [
      makeSummary('I scan the documents', 1),
      makeSummary('Then I file everything', 2),
    ];
    const context = makeContext();
    const schema = extractProgrammatic(summaries, context);

    const result = runQualityGate(schema, summaries);

    expect(result.passed).toBe(true);
    expect(result.checks.structural).toBe(true);
    expect(result.checks.completeness).toBe(true);
    expect(result.checks.richness).toBe(true);
  });

  it('fails on structural invalidity (bad Zod parse)', () => {
    const summaries = [makeSummary('test', 1)];
    const result = runQualityGate({ invalid: true }, summaries);

    expect(result.passed).toBe(false);
    expect(result.checks.structural).toBe(false);
  });

  it('fails on completeness (too few steps for summary count)', () => {
    const summaries = [
      makeSummary('I do step one', 1),
      makeSummary('I do step two', 2),
      makeSummary('I do step three', 3),
      makeSummary('I do step four', 4),
    ];
    const context = makeContext();
    // Create a schema with only 1 step but 4 summaries (need at least 2)
    const schema = extractProgrammatic([makeSummary('Single step', 1)], context);
    // Override metadata to match
    schema.metadata.stepCount = 1;

    const result = runQualityGate(schema, summaries);

    expect(result.checks.completeness).toBe(false);
  });

  it('fails on richness (conditional language but no decision points)', () => {
    const summaries = [makeSummary('If the letter is urgent I process it quickly', 1)];
    const context = makeContext();
    const schema = extractProgrammatic(summaries, context);
    // Force all steps to be non-decision
    for (const step of schema.steps) {
      step.type = 'step';
    }
    schema.metadata.decisionPointCount = 0;

    const result = runQualityGate(schema, summaries);

    expect(result.checks.richness).toBe(false);
  });
});

describe('extractViaLlm', () => {
  it('calls LLM provider when invoked', async () => {
    const context = makeContext();
    const summaries = [makeSummary('I process orders', 1)];

    const validResponse = JSON.stringify({
      schemaVersion: '1.0',
      processNodeId: context.processNodeId,
      interviewId: context.interviewId,
      steps: [
        {
          id: randomUUID(),
          label: 'Process orders',
          type: 'step',
          sourceType: 'interview_discovered',
          sourceExchangeIds: [summaries[0].segmentId],
        },
      ],
      connections: [],
      metadata: {
        extractionMethod: 'llm_fallback',
        extractedAt: new Date().toISOString(),
        stepCount: 1,
        decisionPointCount: 0,
      },
    });

    const mockProvider = createMockProvider(validResponse);
    mockResolveProvider.mockResolvedValue(mockProvider);

    const result = await extractViaLlm(summaries, context);

    expect(mockProvider.sendMessage).toHaveBeenCalled();
    expect(result.metadata.extractionMethod).toBe('llm_fallback');

    // Validate the result passes Zod
    const validation = individualProcessSchemaSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });
});

describe('extractProcessSchema (orchestrator)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses LLM extraction as primary method', async () => {
    const summaries = [
      makeSummary('I scan the documents and sort the mail', 1),
      makeSummary('Then I review the budget and approve expenses', 2),
    ];
    const context = makeContext();

    const llmSchema = {
      schemaVersion: '1.0' as const,
      processNodeId: context.processNodeId,
      interviewId: context.interviewId,
      steps: [
        {
          id: randomUUID(),
          label: 'Scan documents',
          type: 'step' as const,
          sourceType: 'interview_discovered' as const,
          sourceExchangeIds: [summaries[0].segmentId],
        },
        {
          id: randomUUID(),
          label: 'Sort mail',
          type: 'step' as const,
          sourceType: 'interview_discovered' as const,
          sourceExchangeIds: [summaries[0].segmentId],
        },
      ],
      connections: [],
      metadata: {
        extractionMethod: 'llm' as const,
        extractedAt: new Date().toISOString(),
        stepCount: 2,
        decisionPointCount: 0,
      },
    };

    mockResolveProvider.mockResolvedValue({
      sendMessage: vi.fn().mockResolvedValue(JSON.stringify(llmSchema)),
      streamResponse: vi.fn(),
      metadata: {
        providerName: 'anthropic',
        modelName: 'claude-sonnet-4-6',
        modelVersion: '1.0',
        tokenLimits: { input: 200000, output: 8192 },
      },
    } as unknown as LLMProvider);

    const result = await extractProcessSchema(summaries, context);

    expect(result.metadata.extractionMethod).toBe('llm');
  });

  it('falls back to programmatic when LLM fails', async () => {
    const summaries = [
      makeSummary('I scan the documents and sort the mail', 1),
      makeSummary('Then I review the budget and approve expenses', 2),
    ];
    const context = makeContext();

    mockResolveProvider.mockRejectedValue(new Error('LLM unavailable'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await extractProcessSchema(summaries, context);

    expect(result.metadata.extractionMethod).toBe('programmatic');
    expect(warnSpy).toHaveBeenCalledWith(
      '[schema-extractor] LLM extraction failed, falling back to programmatic',
      expect.objectContaining({ error: 'LLM unavailable' }),
    );

    warnSpy.mockRestore();
  });

  it('logs extraction method, duration, and step count', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const summaries = [makeSummary('I process the incoming requests', 1)];
    const context = makeContext();

    // LLM will fail (no mock), falls back to programmatic
    mockResolveProvider.mockRejectedValue(new Error('no mock'));

    await extractProcessSchema(summaries, context);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[schema-extractor] Extraction complete',
      expect.objectContaining({
        method: expect.any(String),
        durationMs: expect.any(Number),
        stepCount: expect.any(Number),
      }),
    );

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
