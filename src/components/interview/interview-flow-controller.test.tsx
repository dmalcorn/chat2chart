import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InterviewFlowController } from './interview-flow-controller';

const mockGetUserMedia = vi.fn();
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
  global.fetch = mockFetch;
});

const defaultProps = {
  intervieweeName: 'Jane Doe',
  processNodeName: 'Review Budget Request',
  projectName: 'Test Project',
  token: '550e8400-e29b-41d4-a716-446655440000',
};

describe('InterviewFlowController', () => {
  it('renders ConsentScreen initially', () => {
    render(<InterviewFlowController {...defaultProps} />);
    expect(screen.getByText('Tell Us About Your Process')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Begin Interview' })).toBeInTheDocument();
  });

  it('transitions to ActiveInterviewPlaceholder after successful start', async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { interviewId: 'id-1', status: 'active' } }),
    });

    render(<InterviewFlowController {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Begin Interview' }));

    await waitFor(() => {
      expect(screen.getByText(/Active interview/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Tell Us About Your Process')).not.toBeInTheDocument();
  });

  it('stays on ConsentScreen when API returns error', async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            message: 'This interview has already been started.',
            code: 'INTERVIEW_ALREADY_STARTED',
          },
        }),
    });

    render(<InterviewFlowController {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Begin Interview' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This interview has already been started.',
      );
    });
    expect(screen.getByText('Tell Us About Your Process')).toBeInTheDocument();
  });
});
