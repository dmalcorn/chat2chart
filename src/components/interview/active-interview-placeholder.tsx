'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ActiveInterviewPlaceholder({
  intervieweeName,
  processNodeName,
}: {
  intervieweeName: string;
  processNodeName: string;
  token: string;
}) {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[560px] rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-lg font-medium">Interview In Progress</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {intervieweeName} — {processNodeName}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          This interview is already active. If you were disconnected, you can try refreshing.
        </p>
        <Button className="mt-6" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
    </main>
  );
}
