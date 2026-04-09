'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMermaid } from '@/hooks/use-mermaid';

export type DiagramVariant = 'individual-interview' | 'individual-carousel' | 'synthesis';

type DiagramCanvasProps = {
  mermaidDefinition: string;
  textAlternative: string;
  isLoading?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  variant: DiagramVariant;
};

const ZOOM_STEP = 0.2;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const PAN_STEP = 30;

export function DiagramCanvas({
  mermaidDefinition,
  textAlternative,
  isLoading = false,
  onConfirm,
  onReject,
  variant,
}: DiagramCanvasProps) {
  const { svg, isRendering, error } = useMermaid(mermaidDefinition, 'diagram-canvas');

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDiagram, setShowDiagram] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fade in diagram when loading completes
  useEffect(() => {
    if (!isLoading && svg && !isRendering) {
      const timer = setTimeout(() => setShowDiagram(true), 50);
      return () => clearTimeout(timer);
    }
    if (isLoading) {
      setShowDiagram(false);
    }
  }, [isLoading, svg, isRendering]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + ZOOM_STEP, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - ZOOM_STEP, MIN_SCALE));
  }, []);

  const handleFit = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      return Math.min(Math.max(s + delta, MIN_SCALE), MAX_SCALE);
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setTranslate((t) => ({ ...t, y: t.y + PAN_STEP }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setTranslate((t) => ({ ...t, y: t.y - PAN_STEP }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setTranslate((t) => ({ ...t, x: t.x + PAN_STEP }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setTranslate((t) => ({ ...t, x: t.x - PAN_STEP }));
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
      }
    },
    [handleZoomIn, handleZoomOut],
  );

  const isIndividualInterview = variant === 'individual-interview';
  const maxWidth = variant === 'synthesis' ? undefined : '700px';
  const shadowClass = variant === 'individual-interview' ? 'shadow-md' : 'shadow-sm';

  // Loading state
  if (isLoading) {
    return (
      <div style={{ maxWidth }} className="mx-auto">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-card px-4 py-3 text-sm text-foreground shadow-sm">
            Let me put together what you described...
          </div>
        </div>
        <div
          className={`animate-pulse rounded-xl bg-card ${shadowClass}`}
          style={{ height: '300px', borderRadius: '12px' }}
          aria-label="Generating diagram..."
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ maxWidth }} className="mx-auto">
        <div
          className={`rounded-xl bg-destructive-soft p-8 text-center text-destructive ${shadowClass}`}
          style={{ borderRadius: '12px' }}
        >
          Failed to render diagram: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth }} className="mx-auto">
      {/* Diagram canvas */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-card ${shadowClass}`}
        style={{ borderRadius: '12px', padding: '32px' }}
        role="img"
        aria-label="Process diagram"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Pan/zoom controls - top right */}
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="flex h-9 items-center justify-center rounded-md bg-background px-2 text-sm text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Fit diagram to view"
          >
            Fit
          </button>
        </div>

        {/* Diagram SVG */}
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 150ms ease',
            opacity: showDiagram ? 1 : 0,
            transitionProperty: 'opacity, transform',
            transitionDuration: showDiagram ? '500ms, 150ms' : '0ms',
            transitionTimingFunction: 'ease-in, ease',
            cursor: isDragging ? 'grabbing' : 'grab',
            minHeight: '200px',
          }}
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
      </div>

      {/* Text alternative */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          View text description
        </summary>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{textAlternative}</p>
      </details>

      {/* Confirm/Reject buttons — individual-interview variant only */}
      {isIndividualInterview && (
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-success px-6 py-2.5 font-semibold text-white hover:bg-success/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
            style={{ borderRadius: '8px' }}
          >
            Yes, that looks right
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded-lg px-4 py-2.5 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Something&apos;s not right
          </button>
        </div>
      )}
    </div>
  );
}
