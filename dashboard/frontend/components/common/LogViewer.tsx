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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1b2d] border border-[#1e3a52] rounded-md w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e3a52]">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#e2e8f0]">{title}</span>
            <span className={`text-[11px] font-mono ${isConnected ? 'text-green-400' : error ? 'text-red-400' : 'text-[#6a6a75]'}`}>{isConnected ? 'connected' : error ? 'error' : 'connecting'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clear} className="text-[12px] text-[#6a6a75] hover:text-[#e2e8f0] px-2 py-1 transition-colors duration-150">Clear</button>
            <button onClick={handleCopy} className="text-[12px] text-[#6a6a75] hover:text-[#e2e8f0] px-2 py-1 transition-colors duration-150">Copy</button>
            {onClose && <button onClick={onClose} className="text-[#6a6a75] hover:text-[#e2e8f0] text-[16px] ml-1 px-1">x</button>}
          </div>
        </div>
        <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 font-mono text-[12px] text-green-300 bg-[#0a1220]">
          {lines.length === 0 && <span className="text-[#3a5068]">Waiting for output...</span>}
          {lines.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">{line}</div>)}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
