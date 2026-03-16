'use client';

import { useEffect, useRef } from 'react';
import { useSSE } from '@/lib/useSSE';

interface LogViewerProps { url: string | null; title?: string; onClose?: () => void; }

export default function LogViewer({ url, title = 'Logs', onClose }: LogViewerProps) {
  const { lines, isConnected, error, clear } = useSSE(url);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  useEffect(() => { if (autoScroll.current && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [lines]);
  const handleScroll = () => { if (!containerRef.current) return; const { scrollTop, scrollHeight, clientHeight } = containerRef.current; autoScroll.current = scrollHeight - scrollTop - clientHeight < 50; };
  const handleCopy = () => { navigator.clipboard.writeText(lines.join('\n')); };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1520] border border-[#1e2d3d] rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-modal overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2d3d] bg-[#111927]">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-white font-medium">{title}</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isConnected ? 'text-emerald-400 bg-emerald-400/10' : error ? 'text-red-400 bg-red-400/10' : 'text-gray-500 bg-gray-500/10'}`}>{isConnected ? 'connected' : error ? 'error' : 'connecting'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clear} className="text-[12px] text-gray-500 hover:text-white px-2 py-1 rounded transition-colors duration-150">Clear</button>
            <button onClick={handleCopy} className="text-[12px] text-gray-500 hover:text-white px-2 py-1 rounded transition-colors duration-150">Copy</button>
            {onClose && (
              <button onClick={onClose} className="text-gray-500 hover:text-white w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center ml-1 transition-colors duration-150">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 font-mono text-[12px] text-emerald-300 bg-[#0a1018]">
          {lines.length === 0 && <span className="text-gray-600">Waiting for output...</span>}
          {lines.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">{line}</div>)}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
