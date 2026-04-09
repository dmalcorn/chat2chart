'use client';

import { DiagramCanvas } from '@/components/diagram/diagram-canvas';

type VerifiedSummaryItem = {
  id: string;
  content: string;
  sequenceNumber: number;
};

type ReadOnlyViewProps = {
  intervieweeName: string;
  processNodeName: string;
  verifiedSummaries: VerifiedSummaryItem[];
  mermaidDefinition: string;
  diagramTextAlternative: string;
};

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

export function ReadOnlyView({
  intervieweeName,
  processNodeName,
  verifiedSummaries,
  mermaidDefinition,
  diagramTextAlternative,
}: ReadOnlyViewProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Heading */}
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Your Process: {processNodeName}
      </h1>
      <p className="mb-8 text-muted-foreground">Captured from {intervieweeName}&apos;s interview</p>

      {/* Verified summaries */}
      <section aria-label="Confirmed reflective summaries" className="mb-8 space-y-4">
        {verifiedSummaries
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
          .map((summary) => (
            <article
              key={summary.id}
              role="article"
              aria-label="Reflective summary confirmed"
              className="rounded-lg"
              style={{
                backgroundColor: 'var(--summary-bg)',
                border: '1.5px solid var(--summary-border)',
                padding: '18px 20px',
              }}
            >
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
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--foreground)', fontWeight: 500 }}
              >
                {summary.content}
              </p>
              <div
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ backgroundColor: 'var(--success-soft)' }}
              >
                <CheckIcon />
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                  Confirmed
                </span>
              </div>
            </article>
          ))}
      </section>

      {/* Validated diagram */}
      <section className="mb-8">
        <DiagramCanvas
          mermaidDefinition={mermaidDefinition}
          textAlternative={diagramTextAlternative}
          variant="individual-carousel"
        />
      </section>

      {/* Completion message */}
      <div className="pt-8 text-center" style={{ color: 'var(--success)' }}>
        <p className="text-lg font-medium">
          Thank you for sharing your expertise. Your process has been captured and will help inform
          how your team&apos;s work is understood.
        </p>
      </div>
    </div>
  );
}
