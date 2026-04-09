'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiagramCanvas } from '@/components/diagram/diagram-canvas';

type DiagramReviewProps = {
  token: string;
  interviewId: string;
  onCaptured?: () => void;
  onCorrectionRequested?: () => void;
};

type SchemaData = {
  schema: object;
  mermaidDefinition: string;
  textAlternative: string;
  validationStatus: string;
};

export function DiagramReview({
  token,
  interviewId,
  onCaptured,
  onCorrectionRequested,
}: DiagramReviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- staged for Story 3.7 correction flow
  const [correctionRequested, setCorrectionRequested] = useState(false);

  useEffect(() => {
    async function fetchSchema() {
      try {
        const res = await fetch(`/api/interview/${token}/schema`);
        if (!res.ok) {
          const body = await res.json();
          setError(body.error?.message ?? 'Failed to load diagram');
          return;
        }
        const body = await res.json();
        setSchemaData(body.data);
      } catch {
        setError('Failed to load diagram');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchema();
  }, [token, interviewId]);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/interview/${token}/schema`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? 'Failed to confirm diagram');
        return;
      }
      onCaptured?.();
    } catch {
      setError('Failed to confirm diagram');
    } finally {
      setIsConfirming(false);
    }
  }, [token, onCaptured]);

  const handleReject = useCallback(() => {
    setCorrectionRequested(true);
    console.warn('Correction flow not yet implemented (Story 3.7)');
    onCorrectionRequested?.();
  }, [onCorrectionRequested]);

  // Update schema data after correction
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- staged for Story 3.7 correction flow
  const handleCorrectionComplete = useCallback(
    (correctedSchema: object, mermaidDefinition: string) => {
      setCorrectionRequested(false);
      if (schemaData) {
        setSchemaData({
          ...schemaData,
          schema: correctedSchema,
          mermaidDefinition,
        });
      }
    },
    [schemaData],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-[700px]">
        <div className="rounded-xl bg-destructive-soft p-8 text-center text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <DiagramCanvas
      mermaidDefinition={schemaData?.mermaidDefinition ?? ''}
      textAlternative={schemaData?.textAlternative ?? ''}
      isLoading={isLoading}
      onConfirm={isConfirming ? undefined : handleConfirm}
      onReject={handleReject}
      variant="individual-interview"
    />
  );
}

export type { DiagramReviewProps };
