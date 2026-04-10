import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock DiagramCanvas to avoid Mermaid rendering
vi.mock('@/components/diagram/diagram-canvas', () => ({
  DiagramCanvas: ({ mermaidDefinition }: { mermaidDefinition: string }) => (
    <div data-testid="diagram-canvas">{mermaidDefinition}</div>
  ),
}));

import { IndividualDiagramCarousel, type InterviewSlide } from './individual-diagram-carousel';

const mockSlides: InterviewSlide[] = [
  {
    intervieweeName: 'Rachel Torres',
    intervieweeRole: 'Austin, TX',
    validatedAt: '2026-04-05T00:00:00Z',
    stepCount: 6,
    mermaidDefinition: 'flowchart TD\n  A("Step 1")',
    schemaJson: {},
  },
  {
    intervieweeName: 'James Chen',
    intervieweeRole: 'Denver, CO',
    validatedAt: '2026-04-06T00:00:00Z',
    stepCount: 5,
    mermaidDefinition: 'flowchart TD\n  B("Step 2")',
    schemaJson: {},
  },
  {
    intervieweeName: 'Sarah Kim',
    intervieweeRole: 'Seattle, WA',
    validatedAt: '2026-04-07T00:00:00Z',
    stepCount: 7,
    mermaidDefinition: 'flowchart TD\n  C("Step 3")',
    schemaJson: {},
  },
];

const onCompare = vi.fn();

describe('IndividualDiagramCarousel', () => {
  it('renders first interviewee name, location, and position indicator', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    expect(screen.getAllByText(/Rachel Torres/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(1/3)')).toBeInTheDocument();
  });

  it('renders sublabel with validation date and step count', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    expect(screen.getByText(/Validated/)).toBeInTheDocument();
    expect(screen.getByText(/6 steps/)).toBeInTheDocument();
  });

  it('left arrow disabled on first slide', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    const prevButton = screen.getByLabelText('Previous interviewee');
    expect(prevButton).toBeDisabled();
  });

  it('right arrow disabled on last slide', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    const nextButton = screen.getByLabelText('Next interviewee');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(nextButton).toBeDisabled();
  });

  it('clicking right arrow advances to next slide', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    fireEvent.click(screen.getByLabelText('Next interviewee'));

    expect(screen.getByText('(2/3)')).toBeInTheDocument();
    expect(screen.getByText(/5 steps/)).toBeInTheDocument();
  });

  it('ArrowLeft/ArrowRight keyboard navigation works', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('(2/3)')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('(1/3)')).toBeInTheDocument();
  });

  it('"Compare with Synthesis" button is visible and calls callback', () => {
    render(<IndividualDiagramCarousel slides={mockSlides} onCompareWithSynthesis={onCompare} />);

    const button = screen.getByText('Compare with Synthesis');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onCompare).toHaveBeenCalledTimes(1);
  });
});

describe('IndividualDiagramCarousel — compact mode', () => {
  it('renders smaller arrows in compact mode', () => {
    render(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        mode="compact"
      />,
    );

    const prevButton = screen.getByLabelText('Previous interviewee');
    // Compact mode uses h-7 w-7 instead of h-9 w-9
    expect(prevButton.className).toContain('h-7');
    expect(prevButton.className).toContain('w-7');
  });

  it('hides "Compare with Synthesis" button in compact mode', () => {
    render(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        mode="compact"
      />,
    );

    expect(screen.queryByText('Compare with Synthesis')).not.toBeInTheDocument();
  });

  it('uses compact sublabel format with role and step count', () => {
    render(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        mode="compact"
      />,
    );

    expect(screen.getByText(/Austin, TX/)).toBeInTheDocument();
    expect(screen.getByText(/6 steps/)).toBeInTheDocument();
    // Should NOT have "Validated" text in compact mode
    expect(screen.queryByText(/Validated/)).not.toBeInTheDocument();
  });

  it('respects controlledIndex prop for parent-driven navigation', () => {
    const { rerender } = render(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        mode="compact"
        controlledIndex={0}
      />,
    );

    expect(screen.getByText('(1/3)')).toBeInTheDocument();

    rerender(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        mode="compact"
        controlledIndex={2}
      />,
    );

    expect(screen.getByText('(3/3)')).toBeInTheDocument();
    expect(screen.getAllByText(/Sarah Kim/).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onIndexChange when manually navigating in compact mode', () => {
    const onIndexChange = vi.fn();
    render(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        mode="compact"
        controlledIndex={0}
        onIndexChange={onIndexChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Next interviewee'));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('hides "Compare with Synthesis" when showCompareButton is false', () => {
    render(
      <IndividualDiagramCarousel
        slides={mockSlides}
        onCompareWithSynthesis={onCompare}
        showCompareButton={false}
      />,
    );

    expect(screen.queryByText('Compare with Synthesis')).not.toBeInTheDocument();
  });
});
