'use client';

interface AgentMessageCardProps {
  content: string;
  isStreaming?: boolean;
}

const BotIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0 text-primary"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);

export function AgentMessageCard({ content, isStreaming = false }: AgentMessageCardProps) {
  return (
    <div className="flex justify-start">
      <div
        className="flex max-w-[75%] gap-3 rounded-lg border px-4 py-3"
        style={{
          backgroundColor: 'var(--primary-soft)',
          borderColor: 'var(--border)',
        }}
      >
        <BotIcon />
        <p
          className="text-lg leading-relaxed"
          style={{ color: 'var(--foreground)', fontWeight: 400 }}
        >
          {content}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
              style={{ backgroundColor: 'var(--foreground)' }}
              aria-hidden="true"
            />
          )}
        </p>
      </div>
    </div>
  );
}
