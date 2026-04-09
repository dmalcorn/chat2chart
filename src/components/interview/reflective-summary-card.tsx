'use client';

import { Button } from '@/components/ui/button';

export type SummaryState =
  | 'streaming'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'correction_requested';

interface ReflectiveSummaryCardProps {
  content: string;
  summaryState: SummaryState;
  segmentId: string;
  isStreaming?: boolean;
  onConfirm?: (segmentId: string) => void;
  onCorrect?: (segmentId: string) => void;
}

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="text-success"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function getAriaLabel(state: SummaryState): string {
  switch (state) {
    case 'streaming':
      return 'Reflective summary streaming';
    case 'awaiting_confirmation':
      return 'Reflective summary awaiting your confirmation';
    case 'confirmed':
      return 'Reflective summary confirmed';
    case 'correction_requested':
      return 'Reflective summary correction requested';
  }
}

export function ReflectiveSummaryCard({
  content,
  summaryState,
  segmentId,
  isStreaming = false,
  onConfirm,
  onCorrect,
}: ReflectiveSummaryCardProps) {
  return (
    <div className="flex justify-start">
      <article
        role="article"
        aria-label={getAriaLabel(summaryState)}
        className="max-w-[80%] rounded-lg"
        style={{
          backgroundColor: 'var(--summary-bg)',
          border: '1.5px solid var(--summary-border)',
          padding: '18px 20px',
          opacity: summaryState === 'correction_requested' ? 0.75 : 1,
        }}
      >
        {/* Label */}
        <p
          className="mb-2 text-xs font-semibold uppercase"
          style={{
            color: 'var(--summary-text)',
            letterSpacing: '0.04em',
            fontSize: '12px',
          }}
        >
          Reflective Summary
        </p>

        {/* Body text */}
        <p
          className="text-lg leading-relaxed"
          style={{ color: 'var(--foreground)', fontWeight: 500 }}
        >
          {content}
          {isStreaming && summaryState === 'streaming' && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
              style={{ backgroundColor: 'var(--foreground)' }}
              aria-hidden="true"
            />
          )}
        </p>

        {/* Awaiting confirmation: buttons */}
        {summaryState === 'awaiting_confirmation' && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={() => onConfirm?.(segmentId)}
              className="rounded-lg font-semibold text-white focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              style={{ backgroundColor: 'var(--success)' }}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              onClick={() => onCorrect?.(segmentId)}
              className="focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              That&apos;s not right
            </Button>
          </div>
        )}

        {/* Confirmed: badge */}
        {summaryState === 'confirmed' && (
          <div
            aria-live="polite"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{ backgroundColor: 'var(--success-soft)' }}
          >
            <CheckIcon />
            <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
              Confirmed
            </span>
          </div>
        )}
      </article>
    </div>
  );
}
