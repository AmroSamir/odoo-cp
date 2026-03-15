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

  // Auto-scroll to bottom
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">{title}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${isConnected ? 'bg-green-500/20 text-green-400' : error ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
              {isConnected ? 'live' : error ? 'error' : 'connecting...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clear} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-gray-800">Clear</button>
            <button onClick={handleCopy} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-gray-800">Copy</button>
            <button onClick={handleDownload} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-gray-800">Download</button>
            {onClose && (
              <button onClick={onClose} className="text-gray-500 hover:text-white ml-2 text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* Log output */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-300 bg-gray-950"
        >
          {lines.length === 0 && (
            <span className="text-gray-600">Waiting for log output...</span>
          )}
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
