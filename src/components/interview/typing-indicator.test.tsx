import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from './typing-indicator';

describe('TypingIndicator', () => {
  it('renders three dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('[aria-hidden="true"]');
    expect(dots.length).toBe(3);
  });

  it('has aria-label="Agent is typing"', () => {
    render(<TypingIndicator />);
    expect(screen.getByLabelText('Agent is typing')).toBeInTheDocument();
  });

  it('has visually hidden text for screen readers', () => {
    render(<TypingIndicator />);
    expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
  });
});
