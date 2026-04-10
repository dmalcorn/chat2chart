'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiagramCanvas } from '@/components/diagram/diagram-canvas';
import { Button } from '@/components/ui/button';

export interface InterviewSlide {
  intervieweeName: string;
  intervieweeRole: string | null;
  validatedAt: string | null;
  stepCount: number;
  mermaidDefinition: string | null;
  schemaJson: unknown;
}

type IndividualDiagramCarouselProps = {
  slides: InterviewSlide[];
  onCompareWithSynthesis: () => void;
  mode?: 'full' | 'compact';
  showCompareButton?: boolean;
  controlledIndex?: number;
  onIndexChange?: (index: number) => void;
  highlightedStepId?: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function IndividualDiagramCarousel({
  slides,
  onCompareWithSynthesis,
  mode = 'full',
  showCompareButton = true,
  controlledIndex,
  onIndexChange,
  highlightedStepId,
}: IndividualDiagramCarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const isCompact = mode === 'compact';

  // Use controlled index when provided, else internal
  const currentIndex = controlledIndex ?? internalIndex;

  // Sync internal index when controlled index changes
  useEffect(() => {
    if (controlledIndex !== undefined) {
      setInternalIndex(controlledIndex);
    }
  }, [controlledIndex]);

  const goNext = useCallback(() => {
    const next = Math.min(currentIndex + 1, slides.length - 1);
    setInternalIndex(next);
    onIndexChange?.(next);
  }, [currentIndex, slides.length, onIndexChange]);

  const goPrev = useCallback(() => {
    const prev = Math.max(currentIndex - 1, 0);
    setInternalIndex(prev);
    onIndexChange?.(prev);
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No captured interviews available.</p>
      </div>
    );
  }

  const slide = slides[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === slides.length - 1;

  // Arrow button size
  const arrowSize = isCompact ? 'h-7 w-7' : 'h-9 w-9';
  const arrowIconSize = isCompact ? 14 : 16;

  return (
    <div className="w-full">
      {/* Header with navigation */}
      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Previous interviewee"
          className={`flex ${arrowSize} items-center justify-center rounded-full border border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <svg
            width={arrowIconSize}
            height={arrowIconSize}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`font-semibold text-foreground ${isCompact ? 'text-sm' : 'text-base'}`}
            >
              {slide.intervieweeName}
              {!isCompact && slide.intervieweeRole && (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  — {slide.intervieweeRole}
                </span>
              )}
              <span className="text-muted-foreground">
                {' '}
                ({currentIndex + 1}/{slides.length})
              </span>
            </span>
          </div>
          <p className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-[13px]'}`}>
            {isCompact ? (
              <>
                {slide.intervieweeRole && `${slide.intervieweeRole} · `}
                {slide.stepCount} steps
              </>
            ) : (
              <>
                Validated {formatDate(slide.validatedAt)} - {slide.stepCount} steps
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={isLast}
          aria-label="Next interviewee"
          className={`flex ${arrowSize} items-center justify-center rounded-full border border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <svg
            width={arrowIconSize}
            height={arrowIconSize}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Position announcement for screen readers */}
      <div aria-live="polite" className="sr-only">
        Showing {slide.intervieweeName}, {currentIndex + 1} of {slides.length}
      </div>

      {/* Diagram with optional highlight */}
      <div className="relative">
        <DiagramCanvas
          mermaidDefinition={slide.mermaidDefinition ?? ''}
          textAlternative={`Process diagram for ${slide.intervieweeName}`}
          variant="individual-carousel"
        />

        {/* Teal glow highlight overlay for the targeted step */}
        {highlightedStepId && /^[\w-]+$/.test(highlightedStepId) && (
          <style>{`
            [id*="${highlightedStepId}"] .node,
            [id*="${highlightedStepId}"] rect,
            [id*="${highlightedStepId}"] polygon,
            [id*="${highlightedStepId}"] circle {
              box-shadow: 0 0 0 3px rgba(13,148,136,0.25);
            }
          `}</style>
        )}
      </div>

      {/* Compare button (Mode 1 only, when showCompareButton is true) */}
      {!isCompact && showCompareButton && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" onClick={onCompareWithSynthesis}>
            Compare with Synthesis
          </Button>
        </div>
      )}
    </div>
  );
}
