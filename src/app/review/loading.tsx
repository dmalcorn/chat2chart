export default function ReviewLoading() {
  return (
    <div className="animate-in fade-in duration-300" aria-busy="true">
      {/* Top bar skeleton */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <main className="mx-auto max-w-[1400px] px-6 pt-20">
        <div className="flex min-h-[calc(100vh-5rem)] items-start justify-center py-8">
          <div className="w-full max-w-[900px]">
            {/* Header skeleton */}
            <div className="mb-4 flex items-center justify-center gap-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
              <div className="text-center">
                <div className="mb-2 h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            </div>

            {/* Diagram skeleton */}
            <div
              className="animate-pulse rounded-xl bg-card shadow-sm"
              style={{ height: '400px', borderRadius: '12px' }}
            />

            {/* Button skeleton */}
            <div className="mt-8 flex justify-center">
              <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
