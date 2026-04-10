'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface TokenEntry {
  intervieweeName: string;
  intervieweeRole: string | null;
  token: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  captured: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  validating: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function TokenList({ refreshKey }: { refreshKey?: number }) {
  const [tokens, setTokens] = useState<TokenEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/interview-tokens');
      if (response.ok) {
        const body = await response.json();
        setTokens(body.data);
        setError('');
      } else {
        setError('Failed to load interview tokens');
      }
    } catch {
      setError('Network error loading tokens');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens, refreshKey]);

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/interview/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Clipboard API unavailable (HTTP context, permissions denied, etc.)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading tokens...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (tokens.length === 0) {
    return <p className="text-sm text-muted-foreground">No interview links yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Link</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.token} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-foreground">{token.intervieweeName}</td>
              <td className="px-4 py-2 text-muted-foreground">{token.intervieweeRole ?? '—'}</td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[token.status] ?? statusColors.pending}`}
                >
                  {token.status}
                </span>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(token.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">
                <Button variant="ghost" size="xs" onClick={() => handleCopy(token.token)}>
                  {copiedToken === token.token ? 'Copied!' : 'Copy'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
