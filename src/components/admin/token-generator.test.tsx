import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TokenGenerator } from './token-generator';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe('TokenGenerator', () => {
  it('renders name and role input fields', () => {
    render(<TokenGenerator />);
    expect(screen.getByLabelText('Interviewee Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Role (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Link' })).toBeInTheDocument();
  });

  it('submits form and displays generated URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            token: 'abc-123',
            intervieweeName: 'Janet Park',
            url: 'http://localhost:3000/interview/abc-123',
          },
        }),
    });

    render(<TokenGenerator />);

    fireEvent.change(screen.getByLabelText('Interviewee Name'), {
      target: { value: 'Janet Park' },
    });
    fireEvent.change(screen.getByLabelText('Role (optional)'), {
      target: { value: 'Mail Clerk' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Link' }));

    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/interview/abc-123')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/interview-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervieweeName: 'Janet Park', intervieweeRole: 'Mail Clerk' }),
    });
  });

  it('copies URL to clipboard when Copy Link is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            token: 'abc-123',
            intervieweeName: 'Test',
            url: 'http://localhost:3000/interview/abc-123',
          },
        }),
    });

    render(<TokenGenerator />);

    fireEvent.change(screen.getByLabelText('Interviewee Name'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Link' }));

    await waitFor(() => {
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Link'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('http://localhost:3000/interview/abc-123');
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('displays error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { message: 'Failed to generate link', code: 'INTERNAL_ERROR' },
        }),
    });

    render(<TokenGenerator />);

    fireEvent.change(screen.getByLabelText('Interviewee Name'), {
      target: { value: 'Fail' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Link' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to generate link')).toBeInTheDocument();
    });
  });
});
