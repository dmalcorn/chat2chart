'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let body;
      try {
        body = await response.json();
      } catch {
        setError('An unexpected error occurred');
        return;
      }

      if (!response.ok) {
        setError(body.error?.message ?? 'An unexpected error occurred');
        return;
      }

      router.push('/review');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-xl bg-card p-8 text-card-foreground shadow-md"
      style={{ borderRadius: '12px' }}
    >
      <h1 className="mb-6 text-center text-xl font-semibold">Sign In</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            autoComplete="email"
          />
        </div>

        <div className="mb-1">
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            autoComplete="current-password"
          />
        </div>

        <p className="mb-6 text-xs text-muted-foreground">
          This is a project-specific password provided by your project manager.
        </p>

        <Button type="submit" disabled={isLoading} className="w-full" size="lg">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
