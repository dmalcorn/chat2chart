// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  generateIndividualMermaid,
  generateTextAlternative,
  sanitizeNodeId,
} from './individual-mermaid-generator';
import type { IndividualProcessSchema } from '@/lib/schema/workflow';

function makeSchema(overrides?: Partial<IndividualProcessSchema>): IndividualProcessSchema {
  const step1Id = randomUUID();
  const step2Id = randomUUID();
  const decisionId = randomUUID();

  return {
    schemaVersion: '1.0',
    processNodeId: randomUUID(),
    interviewId: randomUUID(),
    steps: [
      {
        id: step1Id,
        label: 'Scan documents',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [randomUUID()],
      },
      {
        id: decisionId,
        label: 'Is urgent',
        type: 'decision',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [randomUUID()],
      },
      {
        id: step2Id,
        label: 'File document',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [randomUUID()],
      },
    ],
    connections: [
      { from: step1Id, to: decisionId },
      { from: decisionId, to: step2Id, label: 'Yes' },
    ],
    metadata: {
      extractionMethod: 'programmatic',
      extractedAt: new Date().toISOString(),
      stepCount: 3,
      decisionPointCount: 1,
    },
    ...overrides,
  };
}

describe('generateIndividualMermaid', () => {
  it('generates valid flowchart TD syntax', () => {
    const schema = makeSchema();
    const result = generateIndividualMermaid(schema);

    expect(result).toContain('flowchart TD');
  });

  it('renders steps as rounded rectangles (parentheses syntax)', () => {
    const schema = makeSchema();
    const result = generateIndividualMermaid(schema);

    // Steps use parentheses: nodeId("Label")
    expect(result).toContain('("Scan documents")');
    expect(result).toContain('("File document")');
  });

  it('renders decision points as diamonds (curly brace syntax)', () => {
    const schema = makeSchema();
    const result = generateIndividualMermaid(schema);

    // Decisions use curly braces: nodeId{"Label?"}
    expect(result).toContain('{"Is urgent?"}');
  });

  it('renders labeled connections with pipe syntax', () => {
    const schema = makeSchema();
    const result = generateIndividualMermaid(schema);

    expect(result).toContain('-->|"Yes"|');
  });

  it('renders unlabeled connections as simple arrows', () => {
    const schema = makeSchema();
    const result = generateIndividualMermaid(schema);

    // There should be at least one unlabeled arrow
    expect(result).toMatch(/-->\s+s_/);
  });
});

describe('generateTextAlternative', () => {
  it('includes all steps', () => {
    const schema = makeSchema();
    const result = generateTextAlternative(schema);

    expect(result).toContain('Scan documents');
    expect(result).toContain('File document');
  });

  it('includes decision points', () => {
    const schema = makeSchema();
    const result = generateTextAlternative(schema);

    expect(result).toContain('Decision points:');
    expect(result).toContain('Is urgent');
  });

  it('includes branch labels for decision points', () => {
    const schema = makeSchema();
    const result = generateTextAlternative(schema);

    expect(result).toContain('Yes');
  });

  it('includes flow description', () => {
    const schema = makeSchema();
    const result = generateTextAlternative(schema);

    expect(result).toContain('Flow:');
    expect(result).toContain('leads to');
  });
});

describe('sanitizeNodeId', () => {
  it('replaces hyphens with underscores', () => {
    const uuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const result = sanitizeNodeId(uuid);

    expect(result).not.toContain('-');
    expect(result).toContain('a1b2c3d4_e5f6_4a7b_8c9d_0e1f2a3b4c5d');
  });

  it('prefixes with s_ to avoid Mermaid reserved words', () => {
    const result = sanitizeNodeId(randomUUID());
    expect(result).toMatch(/^s_/);
  });
});
