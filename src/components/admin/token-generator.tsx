'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface GeneratedToken {
  token: string;
  intervieweeName: string;
  url: string;
}

export function TokenGenerator({ onTokenCreated }: { onTokenCreated?: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<GeneratedToken | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setGenerated(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/interview-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervieweeName: name,
          intervieweeRole: role || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error?.message ?? 'Failed to generate link');
        return;
      }

      const body = await response.json();
      setGenerated(body.data);
      setName('');
      setRole('');
      onTokenCreated?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (HTTP context, permissions denied, etc.)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor="intervieweeName"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Interviewee Name
          </label>
          <input
            id="intervieweeName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Janet Park"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="intervieweeRole"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Role (optional)
          </label>
          <input
            id="intervieweeRole"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Mail Clerk"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Link'}
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {generated && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Generated URL for {generated.intervieweeName}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-sm text-foreground">{generated.url}</code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
