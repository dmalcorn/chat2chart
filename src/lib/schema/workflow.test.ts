// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  individualStepSchema,
  individualConnectionSchema,
  individualProcessSchemaSchema,
  sourceTypeSchema,
  workflowStepSchema,
  decisionPointSchema,
  processSchemaSchema,
  matchTypeSchema,
  matchResultSchema,
  matchResultArraySchema,
  synthesisCheckpointSchema,
} from './workflow';

function makeValidStep(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: randomUUID(),
    label: 'Review budget request',
    type: 'step',
    sourceType: 'interview_discovered',
    sourceExchangeIds: [randomUUID()],
    ...overrides,
  };
}

function makeValidSchema(overrides?: Partial<Record<string, unknown>>) {
  const step1 = makeValidStep();
  const step2 = makeValidStep({ label: 'Approve budget' });
  return {
    schemaVersion: '1.0',
    processNodeId: randomUUID(),
    interviewId: randomUUID(),
    steps: [step1, step2],
    connections: [{ from: step1.id, to: step2.id }],
    metadata: {
      extractionMethod: 'programmatic',
      extractedAt: new Date().toISOString(),
      stepCount: 2,
      decisionPointCount: 0,
    },
    ...overrides,
  };
}

describe('IndividualStep schema', () => {
  it('validates a correct step', () => {
    const result = individualStepSchema.safeParse(makeValidStep());
    expect(result.success).toBe(true);
  });

  it('validates a decision step', () => {
    const result = individualStepSchema.safeParse(makeValidStep({ type: 'decision' }));
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = individualStepSchema.safeParse(makeValidStep({ type: 'invalid' }));
    expect(result.success).toBe(false);
  });

  it('rejects missing label', () => {
    const result = individualStepSchema.safeParse(makeValidStep({ label: '' }));
    expect(result.success).toBe(false);
  });

  it('rejects invalid sourceType', () => {
    const result = individualStepSchema.safeParse(makeValidStep({ sourceType: 'unknown' }));
    expect(result.success).toBe(false);
  });
});

describe('IndividualConnection schema', () => {
  it('validates a connection without label', () => {
    const result = individualConnectionSchema.safeParse({
      from: randomUUID(),
      to: randomUUID(),
    });
    expect(result.success).toBe(true);
  });

  it('validates a connection with label', () => {
    const result = individualConnectionSchema.safeParse({
      from: randomUUID(),
      to: randomUUID(),
      label: 'Yes',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for from', () => {
    const result = individualConnectionSchema.safeParse({
      from: 'not-a-uuid',
      to: randomUUID(),
    });
    expect(result.success).toBe(false);
  });
});

// --- Synthesis type helpers ---

function makeWorkflowStep(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: randomUUID(),
    action: 'Review',
    object: 'budget request',
    sourceType: 'synthesis_inferred',
    sequenceOrder: 0,
    ...overrides,
  };
}

function makeDecisionPoint(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: randomUUID(),
    condition: 'Is amount > $5000?',
    branches: [
      { label: 'Yes', targetStepId: randomUUID() },
      { label: 'No', targetStepId: randomUUID() },
    ],
    sourceType: 'synthesis_inferred',
    ...overrides,
  };
}

function makeMatchResult(overrides?: Partial<Record<string, unknown>>) {
  return {
    matchType: 'exact_match',
    confidence: 0.95,
    rationale: 'Both interviews describe scanning the document',
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
    ...overrides,
  };
}

describe('sourceType schema', () => {
  it('accepts interview_discovered', () => {
    expect(sourceTypeSchema.safeParse('interview_discovered').success).toBe(true);
  });

  it('accepts synthesis_inferred', () => {
    expect(sourceTypeSchema.safeParse('synthesis_inferred').success).toBe(true);
  });

  it('rejects invalid source type', () => {
    expect(sourceTypeSchema.safeParse('supervisor_contributed').success).toBe(false);
  });
});

describe('WorkflowStep schema', () => {
  it('validates a correct workflow step', () => {
    expect(workflowStepSchema.safeParse(makeWorkflowStep()).success).toBe(true);
  });

  it('validates step with optional fields', () => {
    const step = makeWorkflowStep({
      actor: 'Clerk',
      systems: ['SAP'],
      sourceInterviewIds: [randomUUID()],
    });
    expect(workflowStepSchema.safeParse(step).success).toBe(true);
  });

  it('rejects missing action', () => {
    expect(workflowStepSchema.safeParse(makeWorkflowStep({ action: '' })).success).toBe(false);
  });

  it('rejects missing object', () => {
    expect(workflowStepSchema.safeParse(makeWorkflowStep({ object: '' })).success).toBe(false);
  });

  it('rejects invalid sourceType', () => {
    expect(workflowStepSchema.safeParse(makeWorkflowStep({ sourceType: 'unknown' })).success).toBe(
      false,
    );
  });
});

describe('DecisionPoint schema', () => {
  it('validates a correct decision point', () => {
    expect(decisionPointSchema.safeParse(makeDecisionPoint()).success).toBe(true);
  });

  it('rejects empty branches', () => {
    expect(decisionPointSchema.safeParse(makeDecisionPoint({ branches: [] })).success).toBe(false);
  });

  it('rejects missing condition', () => {
    expect(decisionPointSchema.safeParse(makeDecisionPoint({ condition: '' })).success).toBe(false);
  });
});

describe('ProcessSchema schema', () => {
  it('validates a complete process schema', () => {
    const step1 = makeWorkflowStep({ sequenceOrder: 0 });
    const step2 = makeWorkflowStep({ sequenceOrder: 1, action: 'Approve', object: 'request' });
    const schema = {
      schemaVersion: '1.0',
      processNodeId: randomUUID(),
      sequence: {
        steps: [step1, step2],
        decisions: [],
        links: [{ from: step1.id, to: step2.id }],
      },
      actors: ['Clerk'],
      metadata: {
        synthesisVersion: 1,
        interviewCount: 3,
        synthesizedAt: new Date().toISOString(),
      },
    };
    expect(processSchemaSchema.safeParse(schema).success).toBe(true);
  });

  it('rejects interviewCount less than 2', () => {
    const step = makeWorkflowStep();
    const schema = {
      schemaVersion: '1.0',
      processNodeId: randomUUID(),
      sequence: { steps: [step], decisions: [], links: [] },
      actors: [],
      metadata: {
        synthesisVersion: 1,
        interviewCount: 1,
        synthesizedAt: new Date().toISOString(),
      },
    };
    expect(processSchemaSchema.safeParse(schema).success).toBe(false);
  });
});

describe('MatchResult schema', () => {
  it.each(['exact_match', 'semantic_match', 'subsumption', 'split_merge', 'unmatched'] as const)(
    'validates match type: %s',
    (matchType) => {
      expect(matchTypeSchema.safeParse(matchType).success).toBe(true);
    },
  );

  it('rejects invalid match type', () => {
    expect(matchTypeSchema.safeParse('fuzzy_match').success).toBe(false);
  });

  it('validates a correct match result', () => {
    expect(matchResultSchema.safeParse(makeMatchResult()).success).toBe(true);
  });

  it('rejects confidence above 1', () => {
    expect(matchResultSchema.safeParse(makeMatchResult({ confidence: 1.5 })).success).toBe(false);
  });

  it('rejects confidence below 0', () => {
    expect(matchResultSchema.safeParse(makeMatchResult({ confidence: -0.1 })).success).toBe(false);
  });

  it('rejects empty rationale', () => {
    expect(matchResultSchema.safeParse(makeMatchResult({ rationale: '' })).success).toBe(false);
  });

  it('rejects empty sourceSteps', () => {
    expect(matchResultSchema.safeParse(makeMatchResult({ sourceSteps: [] })).success).toBe(false);
  });

  it('rejects sourceType that is not synthesis_inferred', () => {
    expect(
      matchResultSchema.safeParse(makeMatchResult({ sourceType: 'interview_discovered' })).success,
    ).toBe(false);
  });

  it('validates a match result array', () => {
    const results = [
      makeMatchResult(),
      makeMatchResult({ matchType: 'semantic_match', confidence: 0.8 }),
    ];
    expect(matchResultArraySchema.safeParse(results).success).toBe(true);
  });
});

describe('SynthesisCheckpoint schema', () => {
  it('validates a correct checkpoint', () => {
    const cp = {
      projectId: randomUUID(),
      processNodeId: randomUUID(),
      synthesisVersion: 1,
      stage: 'match',
      resultJson: { matches: [] },
      durationMs: 1500,
    };
    expect(synthesisCheckpointSchema.safeParse(cp).success).toBe(true);
  });

  it('validates checkpoint without optional durationMs', () => {
    const cp = {
      projectId: randomUUID(),
      processNodeId: randomUUID(),
      synthesisVersion: 1,
      stage: 'classify',
      resultJson: {},
    };
    expect(synthesisCheckpointSchema.safeParse(cp).success).toBe(true);
  });

  it('rejects synthesisVersion less than 1', () => {
    const cp = {
      projectId: randomUUID(),
      processNodeId: randomUUID(),
      synthesisVersion: 0,
      stage: 'match',
      resultJson: {},
    };
    expect(synthesisCheckpointSchema.safeParse(cp).success).toBe(false);
  });

  it('rejects empty stage', () => {
    const cp = {
      projectId: randomUUID(),
      processNodeId: randomUUID(),
      synthesisVersion: 1,
      stage: '',
      resultJson: {},
    };
    expect(synthesisCheckpointSchema.safeParse(cp).success).toBe(false);
  });
});

describe('IndividualProcessSchema schema', () => {
  it('validates a complete valid schema', () => {
    const result = individualProcessSchemaSchema.safeParse(makeValidSchema());
    expect(result.success).toBe(true);
  });

  it('validates schema with decision points', () => {
    const decision = makeValidStep({ type: 'decision', label: 'Is urgent' });
    const yesStep = makeValidStep({ label: 'Flag it' });
    const noStep = makeValidStep({ label: 'File it' });

    const schema = makeValidSchema({
      steps: [decision, yesStep, noStep],
      connections: [
        { from: decision.id, to: yesStep.id, label: 'Yes' },
        { from: decision.id, to: noStep.id, label: 'No' },
      ],
      metadata: {
        extractionMethod: 'programmatic',
        extractedAt: new Date().toISOString(),
        stepCount: 3,
        decisionPointCount: 1,
      },
    });

    const result = individualProcessSchemaSchema.safeParse(schema);
    expect(result.success).toBe(true);
  });

  it('rejects schema with no steps', () => {
    const result = individualProcessSchemaSchema.safeParse(makeValidSchema({ steps: [] }));
    expect(result.success).toBe(false);
  });

  it('rejects schema with invalid extraction method', () => {
    const result = individualProcessSchemaSchema.safeParse(
      makeValidSchema({
        metadata: {
          extractionMethod: 'magic',
          extractedAt: new Date().toISOString(),
          stepCount: 2,
          decisionPointCount: 0,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects schema with missing metadata', () => {
    const schema = makeValidSchema();
    delete (schema as Record<string, unknown>).metadata;
    const result = individualProcessSchemaSchema.safeParse(schema);
    expect(result.success).toBe(false);
  });

  it('validates llm_fallback extraction method', () => {
    const result = individualProcessSchemaSchema.safeParse(
      makeValidSchema({
        metadata: {
          extractionMethod: 'llm_fallback',
          extractedAt: new Date().toISOString(),
          stepCount: 2,
          decisionPointCount: 0,
        },
      }),
    );
    expect(result.success).toBe(true);
  });
});
