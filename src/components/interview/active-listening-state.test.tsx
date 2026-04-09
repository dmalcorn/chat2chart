import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveListeningState } from './active-listening-state';

describe('ActiveListeningState', () => {
  it('renders "I\'m hearing you..." text', () => {
    render(<ActiveListeningState />);
    expect(screen.getByText("I'm hearing you...")).toBeInTheDocument();
  });

  it('renders 8 waveform bars', () => {
    const { container } = render(<ActiveListeningState />);
    // Waveform bars are inside a div with aria-hidden="true" — find the one that contains the bars
    const ariaHiddenEls = container.querySelectorAll('[aria-hidden="true"]');
    let barCount = 0;
    ariaHiddenEls.forEach((el) => {
      // The waveform container has flex items as direct children (the bars)
      const children = el.querySelectorAll('div');
      if (children.length === 8) barCount = 8;
    });
    expect(barCount).toBe(8);
  });

  it('has role="status" with correct aria-label', () => {
    render(<ActiveListeningState />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Recording audio — waveform animation');
  });

  it('waveform bars container has aria-hidden="true"', () => {
    const { container } = render(<ActiveListeningState />);
    // Find the flex container that holds the waveform bars
    const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
    // At least one aria-hidden element should exist for the waveform
    expect(ariaHiddenElements.length).toBeGreaterThan(0);
  });

  it('renders helper text "Words appear after Done"', () => {
    render(<ActiveListeningState />);
    expect(screen.getByText('Words appear after Done')).toBeInTheDocument();
  });
});
