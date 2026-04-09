'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export type MicBarMode = 'idle' | 'recording' | 'processing' | 'text';

interface MicBarProps {
  mode: MicBarMode;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleTextMode: () => void;
  onSendText: (text: string) => void;
  disabled?: boolean;
}

const MicIcon = () => (
  <svg
    width="20"
    height="20"
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
);

const SendIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

function getMicAriaLabel(mode: MicBarMode): string {
  switch (mode) {
    case 'idle':
      return 'Start recording';
    case 'recording':
      return 'Recording in progress';
    case 'processing':
      return 'Processing speech';
    default:
      return 'Start recording';
  }
}

function getStatusText(mode: MicBarMode): string {
  switch (mode) {
    case 'idle':
      return 'Tap to start';
    case 'recording':
      return 'Recording...';
    case 'processing':
      return 'Processing...';
    default:
      return '';
  }
}

export function MicBar({
  mode,
  onStartRecording,
  onStopRecording,
  onToggleTextMode,
  onSendText,
  disabled = false,
}: MicBarProps) {
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'text') {
      textInputRef.current?.focus();
    }
  }, [mode]);

  function handleMicClick() {
    if (mode === 'idle') {
      onStartRecording();
    }
  }

  function handleMicKeyDown(e: React.KeyboardEvent) {
    if (e.key === ' ' && mode === 'idle') {
      e.preventDefault();
      onStartRecording();
    } else if (e.key === ' ' && mode === 'recording') {
      e.preventDefault();
      onStopRecording();
    }
  }

  function handleTextSubmit() {
    const trimmed = textInput.trim();
    if (trimmed) {
      onSendText(trimmed);
      setTextInput('');
    }
  }

  function handleTextKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  }

  if (mode === 'text') {
    return (
      <div
        className="fixed bottom-0 left-1/2 w-full max-w-[800px] -translate-x-1/2 border-t bg-card px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="Type your response..."
            aria-label="Type your response"
            disabled={disabled}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--border)' }}
          />
          <Button
            onClick={handleTextSubmit}
            disabled={disabled || !textInput.trim()}
            className="shrink-0"
          >
            <SendIcon />
            <span className="ml-1">Send</span>
          </Button>
          <button
            type="button"
            onClick={onToggleTextMode}
            className="shrink-0 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            style={{ color: 'var(--primary)' }}
            aria-label="Switch to voice input mode"
          >
            Back to voice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-1/2 w-full max-w-[800px] -translate-x-1/2 border-t bg-card px-4 py-3"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <div className="relative shrink-0">
          {mode === 'recording' && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: 'var(--success)',
                animation: 'pulse-ring 1.5s ease-out infinite',
              }}
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            onClick={handleMicClick}
            onKeyDown={handleMicKeyDown}
            disabled={disabled || mode === 'processing'}
            aria-label={getMicAriaLabel(mode)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-white outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50"
            style={{
              backgroundColor:
                mode === 'recording'
                  ? 'var(--success)'
                  : mode === 'processing'
                    ? 'var(--muted)'
                    : 'var(--destructive-soft)',
              border: mode === 'idle' ? '2px solid var(--destructive)' : 'none',
              color: mode === 'processing' ? 'var(--muted-foreground)' : 'white',
            }}
          >
            <MicIcon />
          </button>
        </div>

        {/* Status text */}
        <div className="flex-1" aria-live="polite">
          <span
            className="text-sm font-medium"
            style={{
              color: mode === 'recording' ? 'var(--success)' : 'var(--muted-foreground)',
            }}
          >
            {getStatusText(mode)}
          </span>
        </div>

        {/* Done button (recording only) */}
        {mode === 'recording' && (
          <Button
            onClick={onStopRecording}
            className="shrink-0 rounded-lg font-medium text-white"
            style={{
              backgroundColor: 'var(--foreground)',
            }}
          >
            Done
          </Button>
        )}

        {/* Prefer to type? toggle */}
        <button
          type="button"
          onClick={onToggleTextMode}
          className="shrink-0 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          style={{ color: 'var(--primary)' }}
          aria-label="Switch to text input mode"
        >
          Prefer to type?
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
