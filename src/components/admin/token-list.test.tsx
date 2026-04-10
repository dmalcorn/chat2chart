import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TokenList } from './token-list';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe('TokenList', () => {
  it('renders table with token data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              intervieweeName: 'Rachel Torres',
              intervieweeRole: 'Mail Clerk',
              token: 'tok-1',
              status: 'captured',
              createdAt: '2026-04-01T09:00:00Z',
            },
            {
              intervieweeName: 'Marcus Williams',
              intervieweeRole: 'Document Processor',
              token: 'tok-2',
              status: 'active',
              createdAt: '2026-04-02T09:00:00Z',
            },
          ],
          count: 2,
        }),
    });

    render(<TokenList />);

    await waitFor(() => {
      expect(screen.getByText('Rachel Torres')).toBeInTheDocument();
      expect(screen.getByText('Marcus Williams')).toBeInTheDocument();
    });

    expect(screen.getByText('Mail Clerk')).toBeInTheDocument();
    expect(screen.getByText('Document Processor')).toBeInTheDocument();
  });

  it('displays correct status badges', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              intervieweeName: 'Rachel',
              intervieweeRole: null,
              token: 'tok-1',
              status: 'captured',
              createdAt: '2026-04-01T09:00:00Z',
            },
            {
              intervieweeName: 'Janet',
              intervieweeRole: null,
              token: 'tok-2',
              status: 'pending',
              createdAt: '2026-04-02T09:00:00Z',
            },
          ],
          count: 2,
        }),
    });

    render(<TokenList />);

    await waitFor(() => {
      expect(screen.getByText('captured')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  it('shows empty state when no tokens exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], count: 0 }),
    });

    render(<TokenList />);

    await waitFor(() => {
      expect(screen.getByText('No interview links yet.')).toBeInTheDocument();
    });
  });

  it('refreshes when refreshKey changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], count: 0 }),
    });

    const { rerender } = render(<TokenList refreshKey={0} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    rerender(<TokenList refreshKey={1} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
