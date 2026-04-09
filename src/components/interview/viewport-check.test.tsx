import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ViewportCheck } from './viewport-check';

describe('ViewportCheck', () => {
  let resizeHandler: (() => void) | null = null;

  beforeEach(() => {
    resizeHandler = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'resize') {
        resizeHandler = handler as () => void;
      }
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when viewport >= 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    render(
      <ViewportCheck>
        <div data-testid="child">Child content</div>
      </ViewportCheck>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders unsupported message when viewport < 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });

    render(
      <ViewportCheck>
        <div data-testid="child">Child content</div>
      </ViewportCheck>,
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(
      screen.getByText('This experience requires a tablet or desktop screen'),
    ).toBeInTheDocument();
  });

  it('switches from unsupported to children on resize', () => {
    Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });

    render(
      <ViewportCheck>
        <div data-testid="child">Child content</div>
      </ViewportCheck>,
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();

    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    act(() => {
      resizeHandler?.();
    });

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
