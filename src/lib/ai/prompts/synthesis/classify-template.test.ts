// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { buildClassifyPrompt } from './classify-template';
import type { ClassifyPromptInput } from './classify-template';

function makeInput(overrides?: Partial<ClassifyPromptInput>): ClassifyPromptInput {
  return {
    matchResults: [
      {
        matchType: 'exact_match',
        confidence: 0.95,
        rationale: 'Identical steps across interviews',
        sourceSteps: [
          {
            interviewId: randomUUID(),
            intervieweeName: 'Alice',
            stepId: randomUUID(),
            stepLabel: 'Scan document',
          },
          {
            interviewId: randomUUID(),
            intervieweeName: 'Bob',
            stepId: randomUUID(),
            stepLabel: 'Scan document',
          },
        ],
        sourceType: 'synthesis_inferred' as const,
      },
      {
        matchType: 'unmatched',
        confidence: 0.7,
        rationale: 'Only found in one interview',
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
              label: 'Scan document',
              type: 'step' as const,
              sourceType: 'interview_discovered' as const,
              sourceExchangeIds: [],
            },
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
            stepCount: 2,
            decisionPointCount: 0,
          },
        },
      },
    ],
    skillContext: 'Mail processing domain with scanning, sorting, and classification steps.',
    ...overrides,
  };
}

describe('buildClassifyPrompt', () => {
  it('includes match results in the prompt', () => {
    const input = makeInput();
    const prompt = buildClassifyPrompt(input);

    expect(prompt).toContain('exact_match');
    expect(prompt).toContain('unmatched');
    expect(prompt).toContain('Identical steps across interviews');
    expect(prompt).toContain('Scan document');
    expect(prompt).toContain('Quality check');
  });

  it('includes individual schema data', () => {
    const input = makeInput();
    const prompt = buildClassifyPrompt(input);

    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Scan document');
    expect(prompt).toContain('Quality check');
  });

  it('includes skill domain context', () => {
    const input = makeInput({
      skillContext: 'IRS mail processing with pre-sorting and digital classification.',
    });
    const prompt = buildClassifyPrompt(input);

    expect(prompt).toContain('IRS mail processing with pre-sorting and digital classification.');
  });

  it('mentions all three divergence types', () => {
    const prompt = buildClassifyPrompt(makeInput());

    expect(prompt).toContain('genuinely_unique');
    expect(prompt).toContain('sequence_conflict');
    expect(prompt).toContain('uncertain_needs_review');
  });

  it('includes implicit step classification types', () => {
    const prompt = buildClassifyPrompt(makeInput());

    expect(prompt).toContain('likely_omission');
    expect(prompt).toContain('genuinely_different');
  });

  it('includes source type requirement', () => {
    const prompt = buildClassifyPrompt(makeInput());

    expect(prompt).toContain('synthesis_inferred');
  });
});
