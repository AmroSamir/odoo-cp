'use client';

import { useEffect, useRef } from 'react';
import { useSSE } from '@/lib/useSSE';

interface LogViewerProps {
  url: string | null;
  title?: string;
  onClose?: () => void;
}

export default function LogViewer({ url, title = 'Logs', onClose }: LogViewerProps) {
  const { lines, isConnected, error, clear } = useSSE(url);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  useEffect(() => {
    if (autoScroll.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.log`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-void border border-subtle rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl shadow-black/50 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-subtle bg-surface">
          <div className="flex items-center gap-3">
            {/* Terminal dots */}
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[13px] font-medium text-white font-mono">{title}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
              isConnected
                ? 'bg-green-500/10 text-green-400'
                : error
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-subtle text-gray-500'
            }`}>
              {isConnected ? 'LIVE' : error ? 'ERR' : '...'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { label: 'Clear', onClick: clear },
              { label: 'Copy', onClick: handleCopy },
              { label: 'Save', onClick: handleDownload },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="text-[11px] text-gray-500 hover:text-white px-2 py-1 rounded-md hover:bg-elevated transition-colors font-mono"
              >
                {btn.label}
              </button>
            ))}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white ml-1 w-7 h-7 flex items-center justify-center rounded-md hover:bg-elevated transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Log output */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-5 font-mono text-[12px] leading-[1.7] bg-void relative"
        >
          <div className="absolute inset-0 scanlines" />
          {lines.length === 0 && (
            <span className="text-gray-600">Waiting for output...</span>
          )}
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all text-green-300/90 relative z-10">
              <span className="text-gray-700 select-none mr-3">{String(i + 1).padStart(3, ' ')}</span>
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
