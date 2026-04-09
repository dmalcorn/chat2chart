// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { randomUUID } from 'crypto';

vi.mock('@/hooks/use-mermaid', () => ({
  useMermaid: vi.fn(() => ({
    svg: '<svg><text>Diagram</text></svg>',
    isRendering: false,
    error: null,
  })),
}));

import { ReadOnlyView } from './read-only-view';

const defaultProps = {
  intervieweeName: 'Jane Doe',
  processNodeName: 'Review Budget Request',
  verifiedSummaries: [
    { id: randomUUID(), content: 'I scan the documents first', sequenceNumber: 1 },
    { id: randomUUID(), content: 'Then I sort the mail', sequenceNumber: 2 },
  ],
  mermaidDefinition: 'flowchart TD\n  A("Scan")',
  diagramTextAlternative: 'Steps: 1. Scan documents',
};

describe('ReadOnlyView', () => {
  it('renders interviewee name and process node name', () => {
    render(<ReadOnlyView {...defaultProps} />);

    expect(screen.getByText('Your Process: Review Budget Request')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
  });

  it('renders all verified summaries with green checkmark badges', () => {
    render(<ReadOnlyView {...defaultProps} />);

    expect(screen.getByText('I scan the documents first')).toBeInTheDocument();
    expect(screen.getByText('Then I sort the mail')).toBeInTheDocument();

    // Both should have "Confirmed" badges
    const confirmBadges = screen.getAllByText('Confirmed');
    expect(confirmBadges).toHaveLength(2);
  });

  it('renders Mermaid diagram canvas', () => {
    render(<ReadOnlyView {...defaultProps} />);

    // DiagramCanvas should be present (via mocked useMermaid)
    expect(screen.getByRole('img', { name: /process diagram/i })).toBeInTheDocument();
  });

  it('renders thank you message', () => {
    render(<ReadOnlyView {...defaultProps} />);

    expect(screen.getByText(/Thank you for sharing your expertise/)).toBeInTheDocument();
  });

  it('has no interactive buttons', () => {
    render(<ReadOnlyView {...defaultProps} />);

    expect(screen.queryByText('Yes, that looks right')).not.toBeInTheDocument();
    expect(screen.queryByText("Something's not right")).not.toBeInTheDocument();
    expect(screen.queryByText('Submit Correction')).not.toBeInTheDocument();
  });
});
