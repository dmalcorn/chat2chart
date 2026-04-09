export default function InterviewLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[560px] rounded-lg bg-card p-8 shadow-lg">
        {/* Heading skeleton */}
        <div className="mx-auto mb-6 h-7 w-3/4 animate-pulse rounded bg-gray-200" />

        {/* Info block skeletons */}
        <div className="space-y-4 mb-8">
          <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-5/6 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Button area skeleton */}
        <div className="mx-auto h-11 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    </main>
  );
}
