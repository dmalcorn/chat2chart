'use client';

interface SpeechCardProps {
  content: string;
  isProcessing: boolean;
  timestamp: string;
}

export function SpeechCard({ content, isProcessing, timestamp }: SpeechCardProps) {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col items-end">
      <span className="mb-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {formattedTime}
      </span>
      <div
        aria-live="polite"
        className="max-w-[75%] rounded-lg border px-4 py-3"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        {isProcessing ? (
          <p className="animate-pulse text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Processing your response...
          </p>
        ) : (
          <p style={{ fontSize: '15px', color: 'var(--foreground)' }}>{content}</p>
        )}
      </div>
    </div>
  );
}
