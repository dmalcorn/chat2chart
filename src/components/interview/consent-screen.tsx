'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ConsentScreenProps {
  processName: string;
  intervieweeName: string;
  token: string;
  onInterviewStarted: () => void;
}

export function ConsentScreen(props: ConsentScreenProps) {
  const { processName, token, onInterviewStarted } = props;
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBeginInterview() {
    setIsStarting(true);
    setError(null);

    // Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // Mic denied — proceed anyway, typed fallback available
    }

    // Start the interview via API
    try {
      const response = await fetch(`/api/interview/${token}/start`, {
        method: 'POST',
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error?.message ?? 'An unexpected error occurred');
        setIsStarting(false);
        return;
      }

      onInterviewStarted();
    } catch {
      setError('An unexpected error occurred');
      setIsStarting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-soft to-background p-4">
      <div className="w-full max-w-[560px] rounded-lg bg-card p-6 shadow-lg">
        <h1
          className="mb-2 font-heading text-foreground"
          style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.2 }}
        >
          Tell Us About Your Process
        </h1>
        <p className="mb-6 text-lg font-normal text-muted-foreground">{processName}</p>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm text-foreground">
              You&apos;ll be having a conversation with an AI assistant that will ask about your
              work process.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="text-sm text-foreground">
              Your responses will be recorded and attributed to you as part of this process
              discovery project.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <p className="text-sm text-foreground">
              You&apos;ll speak your answers using your microphone. A typing option is also
              available.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm text-foreground">This typically takes about 90 seconds.</p>
          </div>
        </div>

        <Button
          className="w-full font-semibold"
          style={{ fontSize: '16px' }}
          disabled={isStarting}
          onClick={handleBeginInterview}
        >
          {isStarting ? 'Starting...' : 'Begin Interview'}
        </Button>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
