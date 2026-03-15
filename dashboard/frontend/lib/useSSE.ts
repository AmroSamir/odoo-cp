'use client';

import { useState, useEffect, useRef } from 'react';

export function useSSE(url: string | null, maxLines = 500) {
  const [lines, setLines] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    setLines([]);
    setError(null);

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (e) => {
      try {
        const line = JSON.parse(e.data);
        setLines((prev) => [...prev.slice(-(maxLines - 1)), String(line)]);
      } catch {
        setLines((prev) => [...prev.slice(-(maxLines - 1)), e.data]);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError('Connection lost');
      es.close();
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [url, maxLines]);

  const clear = () => setLines([]);

  return { lines, isConnected, error, clear };
}
