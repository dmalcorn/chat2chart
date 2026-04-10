type TopBarProps = {
  projectName: string;
  supervisorName: string;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopBar({ projectName, supervisorName }: TopBarProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-primary"
          >
            <rect width="20" height="20" x="2" y="2" rx="4" fill="currentColor" opacity="0.15" />
            <path
              d="M7 12h10M12 7v10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm font-semibold text-foreground">chat2chart</span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{projectName}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {getInitials(supervisorName)}
          </div>
          <span className="text-sm text-foreground">{supervisorName}</span>
        </div>
      </div>
    </header>
  );
}
