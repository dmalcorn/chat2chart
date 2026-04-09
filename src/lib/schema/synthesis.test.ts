// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  classificationResultSchema,
  divergenceAnnotationSchema,
  narrationResultSchema,
  synthesisOutputSchema,
  implicitStepSchema,
} from './synthesis';

function makeDivergence(overrides?: Record<string, unknown>) {
  return {
    id: randomUUID(),
    stepId: randomUUID(),
    divergenceType: 'genuinely_unique',
    intervieweeIds: [randomUUID()],
    confidence: 0.8,
    explanation: 'Test explanation',
    sourceType: 'synthesis_inferred',
    ...overrides,
  };
}

function makeImplicitStep(overrides?: Record<string, unknown>) {
  return {
    id: randomUUID(),
    stepId: randomUUID(),
    mentionedByIds: [randomUUID()],
    omittedByIds: [randomUUID()],
    classification: 'likely_omission',
    confidence: 0.6,
    sourceType: 'synthesis_inferred',
    ...overrides,
  };
}

describe('classificationResultSchema', () => {
  it('validates correct classification output', () => {
    const input = {
      divergences: [makeDivergence()],
      implicitSteps: [makeImplicitStep()],
      processedAt: new Date().toISOString(),
    };
    const result = classificationResultSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid divergence types', () => {
    const input = {
      divergences: [makeDivergence({ divergenceType: 'invalid_type' })],
      implicitSteps: [],
      processedAt: new Date().toISOString(),
    };
    const result = classificationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('validates all three divergence types', () => {
    for (const type of ['genuinely_unique', 'sequence_conflict', 'uncertain_needs_review']) {
      const input = {
        divergences: [makeDivergence({ divergenceType: type })],
        implicitSteps: [],
        processedAt: new Date().toISOString(),
      };
      const result = classificationResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('validates with empty divergences and implicitSteps', () => {
    const input = {
      divergences: [],
      implicitSteps: [],
      processedAt: new Date().toISOString(),
    };
    const result = classificationResultSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('divergenceAnnotationSchema', () => {
  it('rejects sourceType values other than synthesis_inferred', () => {
    const result = divergenceAnnotationSchema.safeParse(
      makeDivergence({ sourceType: 'interview_discovered' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects sourceType with arbitrary values', () => {
    const result = divergenceAnnotationSchema.safeParse(
      makeDivergence({ sourceType: 'supervisor_contributed' }),
    );
    expect(result.success).toBe(false);
  });

  it('validates correct annotation', () => {
    const result = divergenceAnnotationSchema.safeParse(makeDivergence());
    expect(result.success).toBe(true);
  });

  it('rejects confidence outside 0-1 range', () => {
    const result = divergenceAnnotationSchema.safeParse(makeDivergence({ confidence: 1.5 }));
    expect(result.success).toBe(false);
  });
});

describe('implicitStepSchema', () => {
  it('validates correct implicit step', () => {
    const result = implicitStepSchema.safeParse(makeImplicitStep());
    expect(result.success).toBe(true);
  });

  it('rejects invalid classification', () => {
    const result = implicitStepSchema.safeParse(
      makeImplicitStep({ classification: 'unknown_type' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects sourceType other than synthesis_inferred', () => {
    const result = implicitStepSchema.safeParse(
      makeImplicitStep({ sourceType: 'interview_discovered' }),
    );
    expect(result.success).toBe(false);
  });
});

describe('narrationResultSchema', () => {
  it('validates correct narration output', () => {
    const input = {
      divergences: [makeDivergence({ explanation: 'A real explanation' })],
      summary: 'Overall summary of divergences found.',
    };
    const result = narrationResultSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects empty summary', () => {
    const input = {
      divergences: [makeDivergence()],
      summary: '',
    };
    const result = narrationResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

function makeMatchResult(overrides?: Record<string, unknown>) {
  return {
    matchType: 'exact_match',
    confidence: 0.95,
    rationale: 'Steps are identical',
    sourceSteps: [
      {
        interviewId: randomUUID(),
        intervieweeName: 'Test User',
        stepId: randomUUID(),
        stepLabel: 'Test Step',
      },
    ],
    sourceType: 'synthesis_inferred',
    ...overrides,
  };
}

describe('synthesisOutputSchema', () => {
  it('validates complete synthesis result', () => {
    const input = {
      normalizedWorkflow: [makeMatchResult()],
      divergenceAnnotations: [makeDivergence()],
      matchMetadata: [makeMatchResult()],
      narrativeSummary: 'Summary of all divergences.',
      interviewCount: 3,
      sourceInterviewIds: [randomUUID(), randomUUID(), randomUUID()],
    };
    const result = synthesisOutputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects interviewCount below 2', () => {
    const input = {
      normalizedWorkflow: [],
      divergenceAnnotations: [],
      matchMetadata: [],
      narrativeSummary: 'Summary',
      interviewCount: 1,
      sourceInterviewIds: [randomUUID()],
    };
    const result = synthesisOutputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
