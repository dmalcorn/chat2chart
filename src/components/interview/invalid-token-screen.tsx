import { CircleX } from 'lucide-react';

export function InvalidTokenScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[560px] rounded-lg bg-card p-8 shadow-lg text-center">
        <CircleX className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden="true" />
        <p className="text-lg text-muted-foreground">
          This link isn&apos;t valid. Contact the person who sent it to you.
        </p>
      </div>
    </main>
  );
}
