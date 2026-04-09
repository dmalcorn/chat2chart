// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { CorrectionPanel } from './correction-panel';

const defaultProps = {
  token: 'test-token',
  currentSchema: { steps: [] },
  onCorrectionComplete: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CorrectionPanel', () => {
  it('renders textarea and submit button', () => {
    render(<CorrectionPanel {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Tell me what's not right about the diagram..."),
    ).toBeInTheDocument();
    expect(screen.getByText('Submit Correction')).toBeInTheDocument();
  });

  it('submit button is disabled when textarea is empty', () => {
    render(<CorrectionPanel {...defaultProps} />);

    const submitBtn = screen.getByText('Submit Correction');
    expect(submitBtn).toBeDisabled();
  });

  it('sends POST with error description and current schema on submit', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `event: schema\ndata: ${JSON.stringify({ schema: { fixed: true }, mermaidDefinition: 'flowchart TD' })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
          controller.close();
        },
      }),
    } as never);

    render(<CorrectionPanel {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Tell me what's not right about the diagram...");
    fireEvent.change(textarea, { target: { value: 'The second step is wrong' } });
    fireEvent.click(screen.getByText('Submit Correction'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/interview/test-token/schema/correct',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('The second step is wrong'),
        }),
      );
    });

    mockFetch.mockRestore();
  });

  it('shows streaming status indicator during correction', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start() {
          // Don't close — simulate ongoing stream
        },
      }),
    } as never);

    render(<CorrectionPanel {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Tell me what's not right about the diagram...");
    fireEvent.change(textarea, { target: { value: 'Fix step' } });
    fireEvent.click(screen.getByText('Submit Correction'));

    await waitFor(() => {
      expect(screen.getByText('Updating your diagram...')).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });

  it('displays inline error on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Server error' } }),
    } as never);

    render(<CorrectionPanel {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Tell me what's not right about the diagram...");
    fireEvent.change(textarea, { target: { value: 'Fix step' } });
    fireEvent.click(screen.getByText('Submit Correction'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });

  it('cancel button calls onCancel', () => {
    render(<CorrectionPanel {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
