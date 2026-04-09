// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { buildNarratePrompt } from './narrate-template';
import type { NarratePromptInput } from './narrate-template';

function makeInput(overrides?: Partial<NarratePromptInput>): NarratePromptInput {
  const interviewId1 = randomUUID();
  const interviewId2 = randomUUID();

  return {
    classificationResult: {
      divergences: [
        {
          id: randomUUID(),
          stepId: randomUUID(),
          divergenceType: 'genuinely_unique',
          intervieweeIds: [interviewId1],
          confidence: 0.85,
          explanation: '',
          sourceType: 'synthesis_inferred',
        },
      ],
      implicitSteps: [
        {
          id: randomUUID(),
          stepId: randomUUID(),
          mentionedByIds: [interviewId1],
          omittedByIds: [interviewId2],
          classification: 'likely_omission',
          confidence: 0.6,
          sourceType: 'synthesis_inferred',
        },
      ],
      processedAt: new Date().toISOString(),
    },
    individualSchemas: [
      {
        interviewId: interviewId1,
        intervieweeName: 'Janet Park',
        intervieweeRole: 'Mail Clerk',
        schemaJson: {
          schemaVersion: '1.0',
          processNodeId: randomUUID(),
          interviewId: interviewId1,
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
      {
        interviewId: interviewId2,
        intervieweeName: 'Carlos Rivera',
        intervieweeRole: 'Senior Clerk',
        schemaJson: {
          schemaVersion: '1.0',
          processNodeId: randomUUID(),
          interviewId: interviewId2,
          steps: [
            {
              id: randomUUID(),
              label: 'Sort mail',
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
        matchType: 'unmatched',
        confidence: 0.7,
        rationale: 'Unique step',
        sourceSteps: [
          {
            interviewId: interviewId1,
            intervieweeName: 'Janet Park',
            stepId: randomUUID(),
            stepLabel: 'Quality check',
          },
        ],
        sourceType: 'synthesis_inferred' as const,
      },
    ],
    skillContext: 'IRS mail processing domain.',
    ...overrides,
  };
}

describe('buildNarratePrompt', () => {
  it('includes classification results', () => {
    const input = makeInput();
    const prompt = buildNarratePrompt(input);

    expect(prompt).toContain('genuinely_unique');
    expect(prompt).toContain('Divergence 1');
  });

  it('includes interviewee names and roles', () => {
    const input = makeInput();
    const prompt = buildNarratePrompt(input);

    expect(prompt).toContain('Janet Park');
    expect(prompt).toContain('Mail Clerk');
    expect(prompt).toContain('Carlos Rivera');
    expect(prompt).toContain('Senior Clerk');
  });

  it('instructs supervisor-friendly language', () => {
    const prompt = buildNarratePrompt(makeInput());

    expect(prompt).toContain('supervisor');
    expect(prompt).toContain('non-technical');
    expect(prompt).toContain('plain language');
  });

  it('includes skill domain context', () => {
    const input = makeInput({ skillContext: 'Budget review process for federal agencies.' });
    const prompt = buildNarratePrompt(input);

    expect(prompt).toContain('Budget review process for federal agencies.');
  });

  it('includes implicit steps section', () => {
    const prompt = buildNarratePrompt(makeInput());

    expect(prompt).toContain('Implicit Step');
    expect(prompt).toContain('likely_omission');
  });

  it('requires synthesis_inferred source type', () => {
    const prompt = buildNarratePrompt(makeInput());

    expect(prompt).toContain('synthesis_inferred');
  });
});
