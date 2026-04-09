import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { generateSynthesisMermaid } from './mermaid-generator';
import type { SynthesisWorkflowJson } from './mermaid-generator';

function makeMinimalWorkflow(overrides?: Partial<SynthesisWorkflowJson>): SynthesisWorkflowJson {
  const step1 = randomUUID();
  const step2 = randomUUID();
  return {
    steps: [
      { id: step1, label: 'Scan document', type: 'step' },
      { id: step2, label: 'Classify document', type: 'step' },
    ],
    links: [{ from: step1, to: step2 }],
    ...overrides,
  };
}

describe('generateSynthesisMermaid', () => {
  it('produces valid Mermaid flowchart TD syntax for a minimal workflow', () => {
    const workflow = makeMinimalWorkflow();
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain('flowchart TD');
    expect(result).toContain('Scan document');
    expect(result).toContain('Classify document');
    expect(result).toContain('-->');
  });

  it('produces rounded rectangles for regular steps', () => {
    const stepId = 'step_1';
    const workflow: SynthesisWorkflowJson = {
      steps: [{ id: stepId, label: 'Sort mail', type: 'step' }],
      links: [],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain(`${stepId}(["Sort mail"])`);
  });

  it('produces diamond-shaped nodes for decision points', () => {
    const decisionId = 'decision_1';
    const workflow: SynthesisWorkflowJson = {
      steps: [{ id: decisionId, label: 'Is priority?', type: 'decision' }],
      links: [],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain(`${decisionId}{{"Is priority?"}}`);
  });

  it('applies correct CSS class for genuinely_unique divergence', () => {
    const stepId = 'step_unique';
    const workflow: SynthesisWorkflowJson = {
      steps: [{ id: stepId, label: 'QC Check', type: 'step' }],
      links: [],
      divergenceAnnotations: [
        {
          id: randomUUID(),
          stepId,
          divergenceType: 'genuinely_unique',
          intervieweeIds: [randomUUID()],
          confidence: 0.85,
          explanation: 'Only Janet does this',
          sourceType: 'synthesis_inferred',
        },
      ],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain(`class ${stepId} divergence-unique`);
  });

  it('applies correct CSS class for sequence_conflict divergence', () => {
    const stepId = 'step_seq';
    const workflow: SynthesisWorkflowJson = {
      steps: [{ id: stepId, label: 'Pre-sort', type: 'step' }],
      links: [],
      divergenceAnnotations: [
        {
          id: randomUUID(),
          stepId,
          divergenceType: 'sequence_conflict',
          intervieweeIds: [randomUUID(), randomUUID()],
          confidence: 0.9,
          explanation: 'Different ordering',
          sourceType: 'synthesis_inferred',
        },
      ],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain(`class ${stepId} divergence-sequence`);
  });

  it('applies correct CSS class for uncertain_needs_review divergence', () => {
    const stepId = 'step_uncertain';
    const workflow: SynthesisWorkflowJson = {
      steps: [{ id: stepId, label: 'Verify entry', type: 'step' }],
      links: [],
      divergenceAnnotations: [
        {
          id: randomUUID(),
          stepId,
          divergenceType: 'uncertain_needs_review',
          intervieweeIds: [randomUUID()],
          confidence: 0.5,
          explanation: 'Unclear',
          sourceType: 'synthesis_inferred',
        },
      ],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain(`class ${stepId} divergence-uncertain`);
  });

  it('includes classDef statements for all three divergence types', () => {
    const result = generateSynthesisMermaid(makeMinimalWorkflow());

    expect(result).toContain(
      'classDef divergence-unique fill:#CCFBF1,stroke:#0D9488,stroke-width:2px',
    );
    expect(result).toContain(
      'classDef divergence-sequence fill:#99F6E4,stroke:#0F766E,stroke-width:2px',
    );
    expect(result).toContain(
      'classDef divergence-uncertain fill:#FEF3C7,stroke:#D97706,stroke-width:2px',
    );
  });

  it('embeds divergence metadata comments adjacent to annotated nodes', () => {
    const stepId = 'step_annotated';
    const workflow: SynthesisWorkflowJson = {
      steps: [{ id: stepId, label: 'Manual QC', type: 'step' }],
      links: [],
      divergenceAnnotations: [
        {
          id: randomUUID(),
          stepId,
          divergenceType: 'genuinely_unique',
          intervieweeIds: ['int-1'],
          confidence: 0.85,
          explanation: 'Unique QC step',
          sourceType: 'synthesis_inferred',
        },
      ],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain('%% divergence:');
    expect(result).toContain('"type":"genuinely_unique"');
    expect(result).toContain('"intervieweeIds":["int-1"]');
  });

  it('produces nested subgraph blocks for subsumption matches', () => {
    const step1 = 'step_sub_1';
    const step2 = 'step_sub_2';
    const workflow: SynthesisWorkflowJson = {
      steps: [
        { id: step1, label: 'Scan', type: 'step' },
        { id: step2, label: 'Classify', type: 'step' },
      ],
      links: [{ from: step1, to: step2 }],
      subgraphs: [
        {
          id: 'sg_process_doc',
          label: 'Process Document',
          stepIds: [step1, step2],
        },
      ],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain('subgraph sg_process_doc["Process Document"]');
    expect(result).toContain('end');
    // Steps should be inside subgraph, not also outside
    const lines = result.split('\n');
    const sgStart = lines.findIndex((l) => l.includes('subgraph'));
    const sgEnd = lines.findIndex((l) => l.trim() === 'end');
    const scanLine = lines.findIndex((l) => l.includes('Scan'));
    expect(scanLine).toBeGreaterThan(sgStart);
    expect(scanLine).toBeLessThan(sgEnd);
  });

  it('renders link labels correctly', () => {
    const s1 = 'step_a';
    const s2 = 'step_b';
    const workflow: SynthesisWorkflowJson = {
      steps: [
        { id: s1, label: 'Check', type: 'step' },
        { id: s2, label: 'Process', type: 'step' },
      ],
      links: [{ from: s1, to: s2, label: 'Yes' }],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain(`${s1} -->|"Yes"| ${s2}`);
  });

  it('handles demo divergences (sort timing, classification, QC check)', () => {
    const scanStep = 'step_scan';
    const sortStep = 'step_sort';
    const qcStep = 'step_qc';

    const workflow: SynthesisWorkflowJson = {
      steps: [
        { id: scanStep, label: 'Scan incoming mail', type: 'step' },
        { id: sortStep, label: 'Sort by category', type: 'step' },
        { id: qcStep, label: 'Quality check', type: 'step' },
      ],
      links: [
        { from: scanStep, to: sortStep },
        { from: sortStep, to: qcStep },
      ],
      divergenceAnnotations: [
        {
          id: randomUUID(),
          stepId: sortStep,
          divergenceType: 'sequence_conflict',
          intervieweeIds: ['int-austin', 'int-ogden'],
          confidence: 0.9,
          explanation: 'Austin pre-sorts before scanning; others scan first',
          sourceType: 'synthesis_inferred',
        },
        {
          id: randomUUID(),
          stepId: qcStep,
          divergenceType: 'genuinely_unique',
          intervieweeIds: ['int-janet'],
          confidence: 0.85,
          explanation: 'Only Janet performs manual QC',
          sourceType: 'synthesis_inferred',
        },
      ],
    };
    const result = generateSynthesisMermaid(workflow);

    expect(result).toContain('flowchart TD');
    expect(result).toContain(`class ${sortStep} divergence-sequence`);
    expect(result).toContain(`class ${qcStep} divergence-unique`);
    expect(result).toContain('Scan incoming mail');
    expect(result).toContain('Sort by category');
    expect(result).toContain('Quality check');
  });
});
