'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { DiagramCanvas } from '@/components/diagram/diagram-canvas';
import { DivergenceBadge } from './divergence-annotation';
import type { DivergenceAnnotation } from '@/lib/schema/synthesis';
import type { SynthesisData } from './comparison-view';

type SynthesisPanelProps = {
  synthesisData: SynthesisData;
  processNodeName: string;
  selectedDivergenceId: string | null;
  onDivergenceClick: (divergence: DivergenceAnnotation) => void;
};

interface BadgePosition {
  divergence: DivergenceAnnotation;
  top: number;
  left: number;
}

export function SynthesisPanel({
  synthesisData,
  processNodeName,
  selectedDivergenceId,
  onDivergenceClick,
}: SynthesisPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [badgePositions, setBadgePositions] = useState<BadgePosition[]>([]);

  const divergenceAnnotations = synthesisData.workflowJson.divergenceAnnotations;

  // Calculate badge positions based on rendered SVG nodes
  const calculatePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container || divergenceAnnotations.length === 0) {
      setBadgePositions([]);
      return;
    }

    const svg = container.querySelector('svg');
    if (!svg) return;

    const containerRect = container.getBoundingClientRect();
    const positions: BadgePosition[] = [];

    for (const annotation of divergenceAnnotations) {
      // Mermaid generates node elements with IDs matching step IDs
      // Try common Mermaid ID patterns
      // Validate stepId contains only safe characters before using in selector
      if (!/^[\w-]+$/.test(annotation.stepId)) continue;

      const nodeEl =
        svg.querySelector(`[id*="${annotation.stepId}"]`) ??
        svg.querySelector(`[id*="flowchart-${annotation.stepId}"]`);

      if (nodeEl) {
        const nodeRect = nodeEl.getBoundingClientRect();
        positions.push({
          divergence: annotation,
          top: nodeRect.top - containerRect.top,
          left: nodeRect.right - containerRect.left + 4,
        });
      }
    }

    setBadgePositions(positions);
  }, [divergenceAnnotations]);

  // Recalculate positions when diagram renders or container resizes
  useEffect(() => {
    // Delay to let Mermaid finish rendering
    const timer = setTimeout(calculatePositions, 500);

    const observer = new ResizeObserver(() => {
      calculatePositions();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [calculatePositions, synthesisData.mermaidDefinition]);

  return (
    <div>
      <h2 className="mb-3 text-center text-sm font-semibold text-foreground">
        Synthesized Workflow — {processNodeName}
      </h2>
      <div ref={containerRef} className="relative">
        <DiagramCanvas
          mermaidDefinition={synthesisData.mermaidDefinition}
          textAlternative={`Synthesized workflow diagram for ${processNodeName}`}
          variant="synthesis"
        />

        {/* Divergence badge overlays */}
        {badgePositions.map(({ divergence, top, left }) => (
          <div
            key={divergence.id}
            className="absolute z-10"
            style={{ top: `${top}px`, left: `${left}px` }}
          >
            <DivergenceBadge
              divergence={divergence}
              onClick={onDivergenceClick}
              isSelected={selectedDivergenceId === divergence.id}
            />
          </div>
        ))}

        {/* Fallback: render badges below diagram if positioning fails */}
        {badgePositions.length === 0 && divergenceAnnotations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {divergenceAnnotations.map((annotation) => (
              <DivergenceBadge
                key={annotation.id}
                divergence={annotation}
                onClick={onDivergenceClick}
                isSelected={selectedDivergenceId === annotation.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
