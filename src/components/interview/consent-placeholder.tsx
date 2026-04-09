'use client';

export function ConsentPlaceholder({
  intervieweeName,
  processNodeName,
  projectName,
  token,
}: {
  intervieweeName: string;
  processNodeName: string;
  projectName: string;
  token: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[560px] rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-lg font-medium">Consent screen — pending implementation (Story 2.3)</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {intervieweeName} — {processNodeName} — {projectName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground break-all">{token}</p>
      </div>
    </main>
  );
}
