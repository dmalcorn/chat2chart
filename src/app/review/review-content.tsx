'use client';

import {
  ComparisonView,
  type SynthesisData,
  type IndividualSchema,
} from '@/components/supervisor/comparison-view';
import {
  IndividualDiagramCarousel,
  type InterviewSlide,
} from '@/components/supervisor/individual-diagram-carousel';

type ReviewContentProps = {
  synthesisData: SynthesisData | null;
  individualSchemas: IndividualSchema[];
  processNodeName: string;
};

export function ReviewContent({
  synthesisData,
  individualSchemas,
  processNodeName,
}: ReviewContentProps) {
  if (synthesisData) {
    return (
      <ComparisonView
        synthesisData={synthesisData}
        individualSchemas={individualSchemas}
        processNodeName={processNodeName}
      />
    );
  }

  // No synthesis available — show individual carousel only (Mode 1 without compare button)
  if (individualSchemas.length > 0) {
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

    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-start justify-center py-8">
        <div className="w-full max-w-[900px]">
          <IndividualDiagramCarousel
            slides={slides}
            onCompareWithSynthesis={() => {}}
            showCompareButton={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
      <p className="text-muted-foreground">No synthesis results available yet</p>
    </div>
  );
}
