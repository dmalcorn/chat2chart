// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { buildMatchPrompt, toNormalizedSchemas } from './match-template';
import type { NormalizedSchema } from './match-template';

function makeNormalizedSchema(overrides?: Partial<NormalizedSchema>): NormalizedSchema {
  return {
    interviewId: randomUUID(),
    intervieweeName: 'Alice',
    steps: [
      { stepId: randomUUID(), label: 'Scan document', type: 'step' },
      { stepId: randomUUID(), label: 'Classify document', type: 'step' },
    ],
    ...overrides,
  };
}

describe('buildMatchPrompt', () => {
  it('includes all interview steps with source identifiers', () => {
    const schema1 = makeNormalizedSchema({ intervieweeName: 'Alice' });
    const schema2 = makeNormalizedSchema({
      intervieweeName: 'Bob',
      steps: [{ stepId: randomUUID(), label: 'Sort mail', type: 'step' }],
    });

    const prompt = buildMatchPrompt([schema1, schema2]);

    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain(schema1.interviewId);
    expect(prompt).toContain(schema2.interviewId);
    expect(prompt).toContain('Scan document');
    expect(prompt).toContain('Classify document');
    expect(prompt).toContain('Sort mail');
  });

  it('includes the 5 match type definitions', () => {
    const prompt = buildMatchPrompt([makeNormalizedSchema()]);

    expect(prompt).toContain('exact_match');
    expect(prompt).toContain('semantic_match');
    expect(prompt).toContain('subsumption');
    expect(prompt).toContain('split_merge');
    expect(prompt).toContain('unmatched');
  });

  it('includes structured output format specification', () => {
    const prompt = buildMatchPrompt([makeNormalizedSchema()]);

    expect(prompt).toContain('matchType');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('rationale');
    expect(prompt).toContain('sourceSteps');
    expect(prompt).toContain('synthesis_inferred');
  });

  it('includes step IDs in the prompt', () => {
    const stepId = randomUUID();
    const schema = makeNormalizedSchema({
      steps: [{ stepId, label: 'Test step', type: 'step' }],
    });

    const prompt = buildMatchPrompt([schema]);

    expect(prompt).toContain(stepId);
  });
});

describe('toNormalizedSchemas', () => {
  it('converts raw schemas to normalized format', () => {
    const interviewId = randomUUID();
    const stepId = randomUUID();
    const schemas = [
      {
        interviewId,
        schemaJson: {
          schemaVersion: '1.0',
          processNodeId: randomUUID(),
          interviewId,
          steps: [
            {
              id: stepId,
              label: 'Review budget',
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
        },
      },
    ];
    const names = new Map([[interviewId, 'Alice']]);

    const result = toNormalizedSchemas(schemas, names);

    expect(result).toHaveLength(1);
    expect(result[0].intervieweeName).toBe('Alice');
    expect(result[0].steps[0].stepId).toBe(stepId);
    expect(result[0].steps[0].label).toBe('Review budget');
  });

  it('uses Unknown for missing interviewee name', () => {
    const interviewId = randomUUID();
    const schemas = [
      {
        interviewId,
        schemaJson: {
          steps: [
            {
              id: randomUUID(),
              label: 'Step',
              type: 'step',
              sourceType: 'interview_discovered',
              sourceExchangeIds: [],
            },
          ],
        },
      },
    ];

    const result = toNormalizedSchemas(schemas, new Map());

    expect(result[0].intervieweeName).toBe('Unknown');
  });
});
