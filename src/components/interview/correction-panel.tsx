'use client';

import { useState, useCallback } from 'react';

type CorrectionPanelProps = {
  token: string;
  currentSchema: object;
  onCorrectionComplete: (correctedSchema: object, mermaidDefinition: string) => void;
  onCancel: () => void;
};

export function CorrectionPanel({
  token,
  currentSchema,
  onCorrectionComplete,
  onCancel,
}: CorrectionPanelProps) {
  const [errorDescription, setErrorDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!errorDescription.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/interview/${token}/schema/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorDescription, currentSchema }),
      });

      if (!res.ok) {
        const body = await res.json();
        setErrorMessage(body.error?.message ?? 'Failed to submit correction');
        setIsSubmitting(false);
        return;
      }

      // Consume SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        setErrorMessage('Failed to read response stream');
        setIsSubmitting(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            // Next line should be data
            const dataLineIndex = lines.indexOf(line) + 1;
            if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
              const dataStr = lines[dataLineIndex].slice(6);
              try {
                const data = JSON.parse(dataStr);

                if (eventType === 'schema') {
                  onCorrectionComplete(data.schema, data.mermaidDefinition);
                  setIsSubmitting(false);
                  return;
                }

                if (eventType === 'error') {
                  setErrorMessage(
                    "I wasn't able to make that change. Could you try describing it differently?",
                  );
                  setIsSubmitting(false);
                  return;
                }
              } catch {
                // Skip unparseable data
              }
            }
          }
        }
      }

      setIsSubmitting(false);
    } catch {
      setErrorMessage(
        "I wasn't able to make that change. Could you try describing it differently?",
      );
      setIsSubmitting(false);
    }
  }, [errorDescription, currentSchema, token, onCorrectionComplete]);

  return (
    <div className="mt-4 space-y-4">
      {isSubmitting ? (
        <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm">
          <div className="h-4 w-4 animate-pulse rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Updating your diagram...</span>
        </div>
      ) : (
        <>
          <textarea
            value={errorDescription}
            onChange={(e) => setErrorDescription(e.target.value)}
            placeholder="Tell me what's not right about the diagram..."
            className="w-full resize-none rounded-lg border border-input bg-background p-4 text-foreground placeholder:text-muted-foreground focus:outline-2 focus:outline-primary"
            rows={3}
            maxLength={1000}
          />

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!errorDescription.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              Submit Correction
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
