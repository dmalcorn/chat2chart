import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock DiagramCanvas
vi.mock('@/components/diagram/diagram-canvas', () => ({
  DiagramCanvas: ({ mermaidDefinition }: { mermaidDefinition: string }) => (
    <div data-testid="diagram-canvas">{mermaidDefinition}</div>
  ),
}));

import { ComparisonView, type SynthesisData, type IndividualSchema } from './comparison-view';

const mockSynthesisData: SynthesisData = {
  id: 'synth-1',
  processNodeId: 'node-1',
  synthesisVersion: 1,
  workflowJson: {
    normalizedWorkflow: [],
    divergenceAnnotations: [
      {
        id: 'div-1',
        stepId: 'step-5',
        divergenceType: 'genuinely_unique',
        intervieweeIds: ['interview-1'],
        confidence: 0.85,
        explanation: 'Step only mentioned by one interviewee',
        sourceType: 'synthesis_inferred',
      },
      {
        id: 'div-2',
        stepId: 'step-2',
        divergenceType: 'sequence_conflict',
        intervieweeIds: ['interview-1', 'interview-2'],
        confidence: 0.7,
        explanation: 'Different ordering observed',
        sourceType: 'synthesis_inferred',
      },
    ],
    matchMetadata: [],
    narrativeSummary: 'Test summary',
    interviewCount: 3,
    sourceInterviewIds: ['interview-1', 'interview-2', 'interview-3'],
  },
  mermaidDefinition: 'flowchart TD\n  A("Step 1")',
  interviewCount: 3,
  createdAt: '2026-04-05T00:00:00Z',
};

const mockIndividualSchemas: IndividualSchema[] = [
  {
    id: 'schema-1',
    interviewId: 'interview-1',
    intervieweeName: 'Rachel Torres',
    intervieweeRole: 'Austin, TX',
    schemaJson: { steps: [{ id: 'step-1' }, { id: 'step-2' }] },
    mermaidDefinition: 'flowchart TD\n  A("Step 1")',
    validationStatus: 'validated',
  },
  {
    id: 'schema-2',
    interviewId: 'interview-2',
    intervieweeName: 'James Chen',
    intervieweeRole: 'Denver, CO',
    schemaJson: { steps: [{ id: 'step-1' }] },
    mermaidDefinition: 'flowchart TD\n  B("Step 2")',
    validationStatus: 'validated',
  },
  {
    id: 'schema-3',
    interviewId: 'interview-3',
    intervieweeName: 'Sarah Kim',
    intervieweeRole: 'Seattle, WA',
    schemaJson: { steps: [{ id: 'step-1' }, { id: 'step-2' }, { id: 'step-3' }] },
    mermaidDefinition: 'flowchart TD\n  C("Step 3")',
    validationStatus: 'validated',
  },
];

// Helper to set up matchMedia mock
function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '(min-width: 1200px)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    trigger(newMatches: boolean) {
      mql.matches = newMatches;
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
}

describe('ComparisonView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Mode 1 with full-width carousel and "Compare with Synthesis" button when wide viewport', () => {
    mockMatchMedia(true);
    render(
      <ComparisonView
        synthesisData={mockSynthesisData}
        individualSchemas={mockIndividualSchemas}
        processNodeName="Mail Processing"
      />,
    );

    expect(screen.getByText('Compare with Synthesis')).toBeInTheDocument();
    expect(screen.getAllByText(/Rachel Torres/).length).toBeGreaterThanOrEqual(1);
  });

  it('clicking "Compare with Synthesis" transitions to Mode 2 split-screen', () => {
    mockMatchMedia(true);
    render(
      <ComparisonView
        synthesisData={mockSynthesisData}
        individualSchemas={mockIndividualSchemas}
        processNodeName="Mail Processing"
      />,
    );

    fireEvent.click(screen.getByText('Compare with Synthesis'));

    // Mode 2: "Back to Individual Review" button appears
    expect(screen.getByText('Back to Individual Review')).toBeInTheDocument();
    // Synthesis panel title
    expect(screen.getByText(/Synthesized Workflow/)).toBeInTheDocument();
  });

  it('clicking "Back to Individual Review" returns to Mode 1', () => {
    mockMatchMedia(true);
    render(
      <ComparisonView
        synthesisData={mockSynthesisData}
        individualSchemas={mockIndividualSchemas}
        processNodeName="Mail Processing"
      />,
    );

    fireEvent.click(screen.getByText('Compare with Synthesis'));
    fireEvent.click(screen.getByText('Back to Individual Review'));

    expect(screen.getByText('Compare with Synthesis')).toBeInTheDocument();
  });

  it('"Compare with Synthesis" button is hidden when viewport < 1200px', () => {
    mockMatchMedia(false);
    render(
      <ComparisonView
        synthesisData={mockSynthesisData}
        individualSchemas={mockIndividualSchemas}
        processNodeName="Mail Processing"
      />,
    );

    expect(screen.queryByText('Compare with Synthesis')).not.toBeInTheDocument();
  });

  it('auto-reverts from Mode 2 to Mode 1 when viewport shrinks below 1200px', () => {
    const media = mockMatchMedia(true);
    render(
      <ComparisonView
        synthesisData={mockSynthesisData}
        individualSchemas={mockIndividualSchemas}
        processNodeName="Mail Processing"
      />,
    );

    // Enter Mode 2
    fireEvent.click(screen.getByText('Compare with Synthesis'));
    expect(screen.getByText('Back to Individual Review')).toBeInTheDocument();

    // Shrink viewport
    act(() => {
      media.trigger(false);
    });

    // Should revert to Mode 1 — "Compare" button also hidden because viewport is narrow
    expect(screen.queryByText('Back to Individual Review')).not.toBeInTheDocument();
  });
});
