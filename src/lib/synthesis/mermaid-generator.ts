import type { DivergenceAnnotation } from '@/lib/schema/synthesis';

export type SynthesisWorkflowStep = {
  id: string;
  label: string;
  type: 'step' | 'decision';
  sourceInterviewIds?: string[];
};

export type SynthesisWorkflowLink = {
  from: string;
  to: string;
  label?: string;
};

export type SynthesisSubgraph = {
  id: string;
  label: string;
  stepIds: string[];
};

export type SynthesisWorkflowJson = {
  steps: SynthesisWorkflowStep[];
  links: SynthesisWorkflowLink[];
  divergenceAnnotations?: DivergenceAnnotation[];
  subgraphs?: SynthesisSubgraph[];
};

export function generateSynthesisMermaid(workflow: SynthesisWorkflowJson): string {
  const lines: string[] = ['flowchart TD'];

  // Build divergence lookup by stepId
  const divergenceByStep = new Map<string, DivergenceAnnotation>();
  if (workflow.divergenceAnnotations) {
    for (const div of workflow.divergenceAnnotations) {
      divergenceByStep.set(div.stepId, div);
    }
  }

  // Build subgraph lookup
  const stepToSubgraph = new Map<string, string>();
  if (workflow.subgraphs) {
    for (const sg of workflow.subgraphs) {
      for (const stepId of sg.stepIds) {
        stepToSubgraph.set(stepId, sg.id);
      }
    }
  }

  // Collect steps inside subgraphs
  const subgraphSteps = new Set<string>();
  if (workflow.subgraphs) {
    for (const sg of workflow.subgraphs) {
      for (const stepId of sg.stepIds) {
        subgraphSteps.add(stepId);
      }
    }
  }

  // Render subgraphs
  if (workflow.subgraphs) {
    for (const sg of workflow.subgraphs) {
      lines.push(`  subgraph ${sg.id}["${escapeLabel(sg.label)}"]`);
      for (const stepId of sg.stepIds) {
        const step = workflow.steps.find((s) => s.id === stepId);
        if (step) {
          lines.push(`    ${renderNode(step)}`);
          renderDivergenceComment(lines, step.id, divergenceByStep, '    ');
        }
      }
      lines.push('  end');
    }
  }

  // Render steps not in subgraphs
  for (const step of workflow.steps) {
    if (subgraphSteps.has(step.id)) continue;
    lines.push(`  ${renderNode(step)}`);
    renderDivergenceComment(lines, step.id, divergenceByStep, '  ');
  }

  // Render links
  for (const link of workflow.links) {
    if (link.label) {
      lines.push(`  ${link.from} -->|"${escapeLabel(link.label)}"| ${link.to}`);
    } else {
      lines.push(`  ${link.from} --> ${link.to}`);
    }
  }

  // Render class assignments for divergence-annotated nodes
  for (const [stepId, div] of divergenceByStep) {
    const className = divergenceTypeToClass(div.divergenceType);
    lines.push(`  class ${stepId} ${className}`);
  }

  // Render classDef statements
  lines.push('');
  lines.push('  classDef divergence-unique fill:#CCFBF1,stroke:#0D9488,stroke-width:2px');
  lines.push('  classDef divergence-sequence fill:#99F6E4,stroke:#0F766E,stroke-width:2px');
  lines.push('  classDef divergence-uncertain fill:#FEF3C7,stroke:#D97706,stroke-width:2px');

  return lines.join('\n');
}

function renderNode(step: SynthesisWorkflowStep): string {
  const label = escapeLabel(step.label);
  if (step.type === 'decision') {
    return `${step.id}{{"${label}"}}`;
  }
  return `${step.id}(["${label}"])`;
}

function renderDivergenceComment(
  lines: string[],
  stepId: string,
  divergenceByStep: Map<string, DivergenceAnnotation>,
  indent: string,
): void {
  const div = divergenceByStep.get(stepId);
  if (!div) return;
  const meta = JSON.stringify({
    type: div.divergenceType,
    intervieweeIds: div.intervieweeIds,
    confidence: div.confidence,
    explanation: div.explanation,
  });
  lines.push(`${indent}%% divergence: ${meta}`);
}

function divergenceTypeToClass(type: string): string {
  switch (type) {
    case 'genuinely_unique':
      return 'divergence-unique';
    case 'sequence_conflict':
      return 'divergence-sequence';
    case 'uncertain_needs_review':
      return 'divergence-uncertain';
    default:
      return 'divergence-uncertain';
  }
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'");
}
