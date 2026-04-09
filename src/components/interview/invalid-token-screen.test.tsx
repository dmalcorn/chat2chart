import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvalidTokenScreen } from './invalid-token-screen';

describe('InvalidTokenScreen', () => {
  it('renders the error message', () => {
    render(<InvalidTokenScreen />);

    expect(
      screen.getByText("This link isn't valid. Contact the person who sent it to you."),
    ).toBeInTheDocument();
  });

  it('renders the destructive icon', () => {
    const { container } = render(<InvalidTokenScreen />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
