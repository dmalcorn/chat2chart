'use client';

const WAVEFORM_BAR_COUNT = 8;
const BAR_DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

export function ActiveListeningState() {
  return (
    <div className="flex justify-end">
      <div
        role="status"
        aria-label="Recording audio — waveform animation"
        className="max-w-[75%] rounded-lg px-4 py-3"
        style={{
          background: 'color-mix(in srgb, var(--success) 8%, transparent)',
          border: '1.5px solid var(--success)',
        }}
      >
        {/* Row 1: Pulsing dot + status text */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              backgroundColor: 'var(--success)',
              animation: 'pulse-dot 1.5s infinite',
            }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
            I&apos;m hearing you...
          </span>
        </div>

        {/* Row 2: Waveform bars */}
        <div className="flex items-center gap-1 mb-2" aria-hidden="true">
          {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: '3px',
                height: '8px',
                backgroundColor: 'var(--success)',
                animation: `waveform 0.8s ease-in-out infinite`,
                animationDelay: `${BAR_DELAYS[i]}s`,
              }}
            />
          ))}
        </div>

        {/* Row 3: Helper text */}
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Words appear after Done
        </p>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes waveform {
          0%, 100% { height: 8px; }
          50% { height: 28px; }
        }
      `}</style>
    </div>
  );
}
