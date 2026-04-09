'use client';

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        aria-live="polite"
        aria-label="Agent is typing"
        className="inline-flex items-center gap-1 rounded-lg border px-4 py-2"
        style={{
          backgroundColor: 'var(--primary-soft)',
          borderColor: 'var(--border)',
        }}
      >
        <span className="sr-only">Agent is typing...</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: 'var(--muted-foreground)',
              animation: 'typing-bounce 1.2s infinite',
              animationDelay: `${i * 0.15}s`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
