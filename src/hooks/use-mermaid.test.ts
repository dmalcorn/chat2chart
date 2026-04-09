// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock mermaid module
const mockRender = vi.fn();
const mockInitialize = vi.fn();

vi.mock('mermaid', () => ({
  default: {
    initialize: mockInitialize,
    render: mockRender,
  },
}));

import { useMermaid } from './use-mermaid';

beforeEach(() => {
  vi.clearAllMocks();
  mockRender.mockResolvedValue({ svg: '<svg>test</svg>' });
});

describe('useMermaid', () => {
  it('dynamically imports mermaid', async () => {
    const { result } = renderHook(() => useMermaid('flowchart TD\n  A("Step")', 'test-container'));

    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });

    expect(mockRender).toHaveBeenCalled();
  });

  it('returns SVG string on successful render', async () => {
    mockRender.mockResolvedValue({ svg: '<svg>rendered</svg>' });

    const { result } = renderHook(() => useMermaid('flowchart TD\n  A("Step")', 'test-container'));

    await waitFor(() => {
      expect(result.current.svg).toBe('<svg>rendered</svg>');
    });

    expect(result.current.error).toBeNull();
  });

  it('returns error on invalid Mermaid syntax', async () => {
    mockRender.mockRejectedValue(new Error('Parse error: invalid syntax'));

    const { result } = renderHook(() => useMermaid('invalid diagram', 'test-container'));

    await waitFor(() => {
      expect(result.current.error).toBe('Parse error: invalid syntax');
    });

    expect(result.current.svg).toBeNull();
  });

  it('re-renders when definition changes', async () => {
    const { result, rerender } = renderHook(
      ({ def }: { def: string }) => useMermaid(def, 'test-container'),
      { initialProps: { def: 'flowchart TD\n  A("Step 1")' } },
    );

    await waitFor(() => {
      expect(result.current.svg).toBeTruthy();
    });

    mockRender.mockResolvedValue({ svg: '<svg>updated</svg>' });
    rerender({ def: 'flowchart TD\n  B("Step 2")' });

    await waitFor(() => {
      expect(result.current.svg).toBe('<svg>updated</svg>');
    });

    expect(mockRender).toHaveBeenCalledTimes(2);
  });

  it('returns null SVG for empty definition', () => {
    const { result } = renderHook(() => useMermaid('', 'test-container'));

    expect(result.current.svg).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
