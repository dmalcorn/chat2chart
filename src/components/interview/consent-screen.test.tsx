import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsentScreen } from './consent-screen';

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
  processName: 'Receive and Digitize Incoming Mail',
  intervieweeName: 'Jane Doe',
  token: '550e8400-e29b-41d4-a716-446655440000',
  onInterviewStarted: vi.fn(),
};

describe('ConsentScreen', () => {
  it('renders the process name from props', () => {
    render(<ConsentScreen {...defaultProps} />);
    expect(screen.getByText('Receive and Digitize Incoming Mail')).toBeInTheDocument();
  });

  it('renders all four info blocks', () => {
    render(<ConsentScreen {...defaultProps} />);
    expect(screen.getByText(/conversation with an AI assistant/)).toBeInTheDocument();
    expect(screen.getByText(/recorded and attributed/)).toBeInTheDocument();
    expect(screen.getByText(/speak your answers using your microphone/)).toBeInTheDocument();
    expect(screen.getByText(/typically takes about 90 seconds/)).toBeInTheDocument();
  });

  it('renders "Begin Interview" button', () => {
    render(<ConsentScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Begin Interview' })).toBeInTheDocument();
  });

  it('calls getUserMedia and then the start API on button click', async () => {
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { interviewId: 'id-1', status: 'active' } }),
    });

    render(<ConsentScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Begin Interview' }));

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockFetch).toHaveBeenCalledWith(`/api/interview/${defaultProps.token}/start`, {
        method: 'POST',
      });
    });
  });

  it('still calls start API when mic permission is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied'));
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { interviewId: 'id-1', status: 'active' } }),
    });

    render(<ConsentScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Begin Interview' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`/api/interview/${defaultProps.token}/start`, {
        method: 'POST',
      });
    });
  });

  it('displays inline error message on API error', async () => {
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

    render(<ConsentScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Begin Interview' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This interview has already been started.',
      );
    });
  });

  it('calls onInterviewStarted callback on successful start', async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { interviewId: 'id-1', status: 'active' } }),
    });

    render(<ConsentScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Begin Interview' }));

    await waitFor(() => {
      expect(defaultProps.onInterviewStarted).toHaveBeenCalled();
    });
  });
});
