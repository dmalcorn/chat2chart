'use client';

export function CompletedViewPlaceholder({
  intervieweeName,
  processNodeName,
  interviewState,
}: {
  intervieweeName: string;
  processNodeName: string;
  interviewState: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[560px] rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-lg font-medium">
          Completed interview — read-only view pending implementation
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {intervieweeName} — {processNodeName} — {interviewState}
        </p>
      </div>
    </main>
  );
}
