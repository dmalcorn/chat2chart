'use client';

import { useEffect, useRef, useCallback } from 'react';

const SCROLL_THRESHOLD = 50;

export function useAutoScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  deps: unknown[],
) {
  const isAutoScrollEnabled = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (isAutoScrollEnabled.current && sentinelRef.current) {
      sentinelRef.current.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, []);

  // Monitor scroll position to detect user scroll-up
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isAutoScrollEnabled.current = distanceFromBottom <= SCROLL_THRESHOLD;
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  // Auto-scroll when dependencies change (new messages, streaming content)
  useEffect(() => {
    scrollToBottom();
  }, deps);

  return { sentinelRef, scrollToBottom };
}
