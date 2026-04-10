'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { MonitorSmartphone } from 'lucide-react';

const MIN_WIDTH = 768;

export function ViewportCheck({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    function check() {
      setIsSupported(window.innerWidth >= MIN_WIDTH);
    }

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isSupported) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <MonitorSmartphone className="mx-auto mb-4 h-12 w-12 text-amber-500" aria-hidden="true" />
          <p className="text-lg text-muted-foreground">
            This experience works best on a desktop or laptop computer.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
