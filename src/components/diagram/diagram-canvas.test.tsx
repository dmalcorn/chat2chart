// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useMermaid hook
vi.mock('@/hooks/use-mermaid', () => ({
  useMermaid: vi.fn(() => ({
    svg: '<svg><text>Test diagram</text></svg>',
    isRendering: false,
    error: null,
  })),
}));

import { DiagramCanvas } from './diagram-canvas';
import { useMermaid } from '@/hooks/use-mermaid';

const mockUseMermaid = vi.mocked(useMermaid);

const defaultProps = {
  mermaidDefinition: 'flowchart TD\n  A("Step 1")',
  textAlternative: 'Steps:\n  1. Step 1',
  variant: 'individual-interview' as const,
};

describe('DiagramCanvas', () => {
  it('renders loading state with message', () => {
    render(<DiagramCanvas {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Let me put together what you described...')).toBeInTheDocument();
  });

  it('renders Mermaid diagram when not loading', () => {
    render(<DiagramCanvas {...defaultProps} isLoading={false} />);

    expect(screen.getByRole('img', { name: /process diagram/i })).toBeInTheDocument();
  });

  it('renders confirm button that calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(<DiagramCanvas {...defaultProps} isLoading={false} onConfirm={onConfirm} />);

    const confirmButton = screen.getByText('Yes, that looks right');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders reject button that calls onReject', () => {
    const onReject = vi.fn();
    render(<DiagramCanvas {...defaultProps} isLoading={false} onReject={onReject} />);

    const rejectButton = screen.getByText("Something's not right");
    fireEvent.click(rejectButton);

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('renders text alternative in details element', () => {
    render(<DiagramCanvas {...defaultProps} isLoading={false} />);

    expect(screen.getByText('View text description')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Step 1'))).toBeInTheDocument();
  });

  it('renders pan/zoom controls', () => {
    render(<DiagramCanvas {...defaultProps} isLoading={false} />);

    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit diagram to view')).toBeInTheDocument();
  });

  it('does not render buttons for synthesis variant', () => {
    render(<DiagramCanvas {...defaultProps} variant="synthesis" isLoading={false} />);

    expect(screen.queryByText('Yes, that looks right')).not.toBeInTheDocument();
    expect(screen.queryByText("Something's not right")).not.toBeInTheDocument();
  });

  it('does not render buttons for individual-carousel variant', () => {
    render(<DiagramCanvas {...defaultProps} variant="individual-carousel" isLoading={false} />);

    expect(screen.queryByText('Yes, that looks right')).not.toBeInTheDocument();
  });

  it('renders error state when Mermaid fails', () => {
    mockUseMermaid.mockReturnValue({
      svg: null,
      isRendering: false,
      error: 'Parse error',
    });

    render(<DiagramCanvas {...defaultProps} isLoading={false} />);

    expect(screen.getByText(/Failed to render diagram/)).toBeInTheDocument();
  });
});
