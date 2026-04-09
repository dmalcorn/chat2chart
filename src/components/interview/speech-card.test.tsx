import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpeechCard } from './speech-card';

const defaultProps = {
  content: 'I process incoming mail by scanning it first.',
  isProcessing: false,
  timestamp: '2026-04-09T10:30:00.000Z',
};

describe('SpeechCard', () => {
  it('processing state shows "Processing your response..." text', () => {
    render(<SpeechCard {...defaultProps} isProcessing={true} />);
    expect(screen.getByText('Processing your response...')).toBeInTheDocument();
  });

  it('completed state shows speech text', () => {
    render(<SpeechCard {...defaultProps} />);
    expect(screen.getByText('I process incoming mail by scanning it first.')).toBeInTheDocument();
  });

  it('completed state shows timestamp', () => {
    render(<SpeechCard {...defaultProps} />);
    // Check that some time string is rendered (format depends on locale)
    const container = screen
      .getByText('I process incoming mail by scanning it first.')
      .closest('div');
    expect(container?.parentElement?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it('has aria-live="polite" on card container', () => {
    render(<SpeechCard {...defaultProps} />);
    const liveRegion = screen
      .getByText('I process incoming mail by scanning it first.')
      .closest('[aria-live]');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
