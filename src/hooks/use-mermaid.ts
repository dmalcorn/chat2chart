'use client';

import { useState, useEffect, useRef } from 'react';

let mermaidInitialized = false;

export function useMermaid(
  definition: string,
  containerId: string,
): { svg: string | null; isRendering: boolean; error: string | null } {
  const [svg, setSvg] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderCounter = useRef(0);

  useEffect(() => {
    if (!definition) {
      setSvg(null);
      setError(null);
      return;
    }

    const currentRender = ++renderCounter.current;
    setIsRendering(true);
    setError(null);

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis',
            },
            securityLevel: 'strict',
          });
          mermaidInitialized = true;
        }

        const uniqueId = `${containerId}_${currentRender}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, definition);

        if (currentRender === renderCounter.current) {
          setSvg(renderedSvg);
          setIsRendering(false);
        }
      } catch (err) {
        if (currentRender === renderCounter.current) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg(null);
          setIsRendering(false);
        }
      }
    })();
  }, [definition, containerId]);

  return { svg, isRendering, error };
}
