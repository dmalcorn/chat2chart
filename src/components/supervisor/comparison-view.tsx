'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DivergenceAnnotation } from '@/lib/schema/synthesis';
import { IndividualDiagramCarousel, type InterviewSlide } from './individual-diagram-carousel';
import { SynthesisPanel } from './synthesis-panel';
import { DivergenceDetailCard } from './divergence-annotation';

export interface SynthesisData {
  id: string;
  processNodeId: string;
  synthesisVersion: number;
  workflowJson: {
    normalizedWorkflow: unknown[];
    divergenceAnnotations: DivergenceAnnotation[];
    matchMetadata: unknown[];
    narrativeSummary: string;
    interviewCount: number;
    sourceInterviewIds: string[];
  };
  mermaidDefinition: string;
  interviewCount: number;
  createdAt: string;
}

export interface IndividualSchema {
  id: string;
  interviewId: string;
  intervieweeName: string;
  intervieweeRole: string | null;
  schemaJson: unknown;
  mermaidDefinition: string;
  validationStatus: string;
  validatedAt?: string | null;
}

type ComparisonViewProps = {
  synthesisData: SynthesisData;
  individualSchemas: IndividualSchema[];
  processNodeName: string;
};

export function ComparisonView({
  synthesisData,
  individualSchemas,
  processNodeName,
}: ComparisonViewProps) {
  const [mode, setMode] = useState<'individual' | 'comparison'>('individual');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedDivergenceId, setSelectedDivergenceId] = useState<string | null>(null);
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const [isWideViewport, setIsWideViewport] = useState(false);

  // Viewport width detection
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1200px)');
    setIsWideViewport(mql.matches);

    function handleChange(e: MediaQueryListEvent) {
      setIsWideViewport(e.matches);
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // Auto-revert to Mode 1 when viewport shrinks below 1200px
  useEffect(() => {
    if (!isWideViewport && mode === 'comparison') {
      setMode('individual');
      setSelectedDivergenceId(null);
      setHighlightedStepId(null);
    }
  }, [isWideViewport, mode]);

  const handleCompareWithSynthesis = useCallback(() => {
    setMode('comparison');
  }, []);

  const handleBackToIndividual = useCallback(() => {
    setMode('individual');
    setSelectedDivergenceId(null);
    setHighlightedStepId(null);
  }, []);

  const handleDivergenceClick = useCallback(
    (divergence: DivergenceAnnotation) => {
      // Find the first interviewee involved in this divergence
      const targetIntervieweeId = divergence.intervieweeIds[0];
      const targetIndex = individualSchemas.findIndex((s) => s.interviewId === targetIntervieweeId);

      setSelectedDivergenceId(divergence.id);
      setHighlightedStepId(divergence.stepId);
      if (targetIndex >= 0) {
        setCarouselIndex(targetIndex);
      }
    },
    [individualSchemas],
  );

  const handleCarouselManualNavigate = useCallback((index: number) => {
    setCarouselIndex(index);
    // Clear highlight when user manually navigates
    setSelectedDivergenceId(null);
    setHighlightedStepId(null);
  }, []);

  // Build slides from individual schemas
  const slides: InterviewSlide[] = individualSchemas.map((schema) => {
    const schemaObj = schema.schemaJson as { steps?: unknown[] } | null;
    const stepCount = Array.isArray(schemaObj?.steps) ? schemaObj.steps.length : 0;

    return {
      intervieweeName: schema.intervieweeName,
      intervieweeRole: schema.intervieweeRole,
      validatedAt: schema.validatedAt ?? null,
      stepCount,
      mermaidDefinition: schema.mermaidDefinition,
      schemaJson: schema.schemaJson,
    };
  });

  const selectedDivergence = selectedDivergenceId
    ? (synthesisData.workflowJson.divergenceAnnotations.find(
        (d) => d.id === selectedDivergenceId,
      ) ?? null)
    : null;

  const isComparison = mode === 'comparison';

  return (
    <div className="relative w-full">
      {isComparison ? (
        /* Mode 2: Split-screen */
        <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>
          {/* Synthesis panel (left ~55%) */}
          <div
            className="w-[55%] shrink-0"
            style={{
              transition: 'transform 250ms ease-out, opacity 250ms ease-out',
            }}
          >
            <SynthesisPanel
              synthesisData={synthesisData}
              processNodeName={processNodeName}
              selectedDivergenceId={selectedDivergenceId}
              onDivergenceClick={handleDivergenceClick}
            />

            {/* Divergence detail card */}
            {selectedDivergence && (
              <div className="mt-4">
                <DivergenceDetailCard
                  divergence={selectedDivergence}
                  individualSchemas={individualSchemas}
                  onClose={() => {
                    setSelectedDivergenceId(null);
                    setHighlightedStepId(null);
                  }}
                />
              </div>
            )}

            {/* Back button */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleBackToIndividual}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Back to Individual Review
              </button>
            </div>
          </div>

          {/* Individual carousel (right ~45%) */}
          <div className="w-[45%]">
            <IndividualDiagramCarousel
              slides={slides}
              onCompareWithSynthesis={handleCompareWithSynthesis}
              mode="compact"
              controlledIndex={carouselIndex}
              onIndexChange={handleCarouselManualNavigate}
              highlightedStepId={highlightedStepId}
            />
          </div>
        </div>
      ) : (
        /* Mode 1: Full-width individual carousel */
        <div className="flex min-h-[calc(100vh-5rem)] items-start justify-center py-8">
          <div className="w-full max-w-[900px]">
            <IndividualDiagramCarousel
              slides={slides}
              onCompareWithSynthesis={handleCompareWithSynthesis}
              mode="full"
              showCompareButton={isWideViewport}
            />
          </div>
        </div>
      )}
    </div>
  );
}
