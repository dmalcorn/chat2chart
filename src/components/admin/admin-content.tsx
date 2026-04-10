'use client';

import { useState } from 'react';
import { TokenGenerator } from './token-generator';
import { TokenList } from './token-list';

export function AdminContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Generate New Interview Link</h2>
        <TokenGenerator onTokenCreated={() => setRefreshKey((k) => k + 1)} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Existing Interview Links</h2>
        <TokenList refreshKey={refreshKey} />
      </section>
    </>
  );
}
