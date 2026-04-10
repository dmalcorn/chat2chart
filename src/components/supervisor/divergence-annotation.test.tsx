import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DivergenceBadge, DivergenceDetailCard } from './divergence-annotation';
import type { DivergenceAnnotation } from '@/lib/schema/synthesis';
import type { IndividualSchema } from './comparison-view';

const uniqueDivergence: DivergenceAnnotation = {
  id: 'div-1',
  stepId: 'step-5',
  divergenceType: 'genuinely_unique',
  intervieweeIds: ['interview-1'],
  confidence: 0.85,
  explanation: 'Only Rachel mentioned this step',
  sourceType: 'synthesis_inferred',
};

const sequenceDivergence: DivergenceAnnotation = {
  id: 'div-2',
  stepId: 'step-2',
  divergenceType: 'sequence_conflict',
  intervieweeIds: ['interview-1', 'interview-2'],
  confidence: 0.7,
  explanation: 'Different ordering observed between interviewees',
  sourceType: 'synthesis_inferred',
};

const uncertainDivergence: DivergenceAnnotation = {
  id: 'div-3',
  stepId: 'step-3',
  divergenceType: 'uncertain_needs_review',
  intervieweeIds: ['interview-2'],
  confidence: 0.3,
  explanation: 'Unclear whether this step is distinct',
  sourceType: 'synthesis_inferred',
};

const mockSchemas: IndividualSchema[] = [
  {
    id: 'schema-1',
    interviewId: 'interview-1',
    intervieweeName: 'Rachel Torres',
    intervieweeRole: 'Austin, TX',
    schemaJson: {},
    mermaidDefinition: '',
    validationStatus: 'validated',
  },
  {
    id: 'schema-2',
    interviewId: 'interview-2',
    intervieweeName: 'James Chen',
    intervieweeRole: 'Denver, CO',
    schemaJson: {},
    mermaidDefinition: '',
    validationStatus: 'validated',
  },
  {
    id: 'schema-3',
    interviewId: 'interview-3',
    intervieweeName: 'Sarah Kim',
    intervieweeRole: 'Seattle, WA',
    schemaJson: {},
    mermaidDefinition: '',
    validationStatus: 'validated',
  },
];

describe('DivergenceBadge', () => {
  it('renders "Genuinely Unique" label with teal background for genuinely_unique type', () => {
    const onClick = vi.fn();
    render(<DivergenceBadge divergence={uniqueDivergence} onClick={onClick} isSelected={false} />);

    const badge = screen.getByText('Genuinely Unique');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-teal-600');
  });

  it('renders "Sequence Conflict" label with darker teal for sequence_conflict type', () => {
    const onClick = vi.fn();
    render(
      <DivergenceBadge divergence={sequenceDivergence} onClick={onClick} isSelected={false} />,
    );

    const badge = screen.getByText('Sequence Conflict');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-teal-700');
  });

  it('renders "Uncertain — Needs Review" label with amber for uncertain type', () => {
    const onClick = vi.fn();
    render(
      <DivergenceBadge divergence={uncertainDivergence} onClick={onClick} isSelected={false} />,
    );

    const badge = screen.getByText('Uncertain — Needs Review');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-amber-500');
  });

  it('calls onClick with divergence data when clicked', () => {
    const onClick = vi.fn();
    render(<DivergenceBadge divergence={uniqueDivergence} onClick={onClick} isSelected={false} />);

    fireEvent.click(screen.getByText('Genuinely Unique'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(uniqueDivergence);
  });

  it('calls onClick when Enter key is pressed (AC #9)', () => {
    const onClick = vi.fn();
    render(<DivergenceBadge divergence={uniqueDivergence} onClick={onClick} isSelected={false} />);

    const badge = screen.getByText('Genuinely Unique');
    fireEvent.keyDown(badge, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(uniqueDivergence);
  });

  it('has ring highlight when isSelected is true', () => {
    const onClick = vi.fn();
    render(<DivergenceBadge divergence={uniqueDivergence} onClick={onClick} isSelected={true} />);

    const badge = screen.getByText('Genuinely Unique');
    expect(badge.className).toContain('ring-2');
  });
});

describe('DivergenceDetailCard', () => {
  it('renders explanation text', () => {
    render(<DivergenceDetailCard divergence={uniqueDivergence} individualSchemas={mockSchemas} />);

    expect(screen.getByText('Only Rachel mentioned this step')).toBeInTheDocument();
  });

  it('renders confidence level', () => {
    render(<DivergenceDetailCard divergence={uniqueDivergence} individualSchemas={mockSchemas} />);

    expect(screen.getByText('Confidence: High')).toBeInTheDocument();
  });

  it('renders source tags for involved interviewees', () => {
    render(<DivergenceDetailCard divergence={uniqueDivergence} individualSchemas={mockSchemas} />);

    expect(screen.getByText('Rachel Torres')).toBeInTheDocument();
  });

  it('renders "Not mentioned" tags for uninvolved interviewees', () => {
    render(<DivergenceDetailCard divergence={uniqueDivergence} individualSchemas={mockSchemas} />);

    expect(screen.getByText(/James Chen — Not mentioned/)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Kim — Not mentioned/)).toBeInTheDocument();
  });

  it('has 3px teal left border', () => {
    const { container } = render(
      <DivergenceDetailCard divergence={uniqueDivergence} individualSchemas={mockSchemas} />,
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('border-l-[3px]');
    expect(card.className).toContain('border-teal-600');
  });

  it('renders type badge in the card', () => {
    render(
      <DivergenceDetailCard divergence={sequenceDivergence} individualSchemas={mockSchemas} />,
    );

    expect(screen.getByText('Sequence Conflict')).toBeInTheDocument();
  });

  it('calls onClose when dismiss is clicked', () => {
    const onClose = vi.fn();
    render(
      <DivergenceDetailCard
        divergence={uniqueDivergence}
        individualSchemas={mockSchemas}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
