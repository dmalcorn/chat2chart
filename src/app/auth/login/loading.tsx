export default function LoginLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background animate-in fade-in duration-300"
      aria-busy="true"
    >
      <div
        className="w-full max-w-sm rounded-xl bg-card p-8 shadow-md"
        style={{ borderRadius: '12px' }}
      >
        {/* Title skeleton */}
        <div className="mx-auto mb-6 h-6 w-20 animate-pulse rounded bg-muted" />

        {/* Email label + input skeleton */}
        <div className="mb-4">
          <div className="mb-1 h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Password label + input skeleton */}
        <div className="mb-1">
          <div className="mb-1 h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>

        {/* Helper text skeleton */}
        <div className="mb-6 mt-1 h-3 w-3/4 animate-pulse rounded bg-muted" />

        {/* Button skeleton */}
        <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </main>
  );
}
