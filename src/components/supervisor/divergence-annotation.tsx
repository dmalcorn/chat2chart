'use client';

import type { DivergenceAnnotation, DivergenceType } from '@/lib/schema/synthesis';
import type { IndividualSchema } from './comparison-view';

// --- Badge color + label mapping ---

const BADGE_CONFIG: Record<DivergenceType, { bg: string; label: string }> = {
  genuinely_unique: { bg: 'bg-teal-600 text-white', label: 'Genuinely Unique' },
  sequence_conflict: { bg: 'bg-teal-700 text-white', label: 'Sequence Conflict' },
  uncertain_needs_review: { bg: 'bg-amber-500 text-white', label: 'Uncertain — Needs Review' },
};

// --- DivergenceBadge ---

type DivergenceBadgeProps = {
  divergence: DivergenceAnnotation;
  onClick: (divergence: DivergenceAnnotation) => void;
  isSelected: boolean;
};

export function DivergenceBadge({ divergence, onClick, isSelected }: DivergenceBadgeProps) {
  const config = BADGE_CONFIG[divergence.divergenceType];

  function handleClick() {
    onClick(divergence);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClick(divergence);
    }
  }

  return (
    <button
      type="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${config.label} divergence on step`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-tight ${config.bg} ${
        isSelected ? 'ring-2 ring-teal-400 ring-offset-1' : ''
      } cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600`}
    >
      {config.label}
    </button>
  );
}

// --- DivergenceDetailCard ---

type DivergenceDetailCardProps = {
  divergence: DivergenceAnnotation;
  individualSchemas: IndividualSchema[];
  onClose?: () => void;
};

function formatConfidence(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  if (confidence > 0) return 'Low';
  return 'N/A';
}

export function DivergenceDetailCard({
  divergence,
  individualSchemas,
  onClose,
}: DivergenceDetailCardProps) {
  const config = BADGE_CONFIG[divergence.divergenceType];

  // Determine which interviewees are involved vs not
  const involvedNames = divergence.intervieweeIds.map((id) => {
    const schema = individualSchemas.find((s) => s.interviewId === id);
    return schema?.intervieweeName ?? id;
  });

  const notMentionedNames = individualSchemas
    .filter((s) => !divergence.intervieweeIds.includes(s.interviewId))
    .map((s) => s.intervieweeName);

  return (
    <div
      className="rounded-lg border-l-[3px] border-teal-600 bg-card p-4 shadow-sm"
      aria-live="polite"
    >
      {/* Top row: type badge + confidence */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg}`}
        >
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">
          Confidence: {formatConfidence(divergence.confidence)}
        </span>
      </div>

      {/* Explanation */}
      <p className="mb-3 text-sm text-foreground">{divergence.explanation}</p>

      {/* Source tags */}
      <div className="flex flex-wrap gap-1.5">
        {involvedNames.map((name) => (
          <span
            key={name}
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {name}
          </span>
        ))}
        {notMentionedNames.map((name) => (
          <span
            key={name}
            className="rounded-md bg-muted px-2 py-0.5 text-xs italic text-muted-foreground"
          >
            {name} — Not mentioned
          </span>
        ))}
      </div>

      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
