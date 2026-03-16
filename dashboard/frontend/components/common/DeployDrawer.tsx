'use client';

import { useEffect, useRef, useState } from 'react';

interface DeployDrawerProps { open: boolean; title: string; logs: string[]; deploying: boolean; result: { success: boolean; message: string } | null; onClose: () => void; children?: React.ReactNode; }

function formatTime(s: number) { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; }

export default function DeployDrawer({ open, title, logs, deploying, result, onClose, children }: DeployDrawerProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  useEffect(() => {
    if (deploying) { setElapsed(0); timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000); }
    else if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [deploying]);
  useEffect(() => {
    if (!deploying) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = 'Deployment in progress.'; return e.returnValue; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [deploying]);

  const handleClose = () => { if (deploying && !window.confirm('Deployment is still running. Close?')) return; onClose(); };
  const handleCopy = () => { navigator.clipboard.writeText(logs.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={handleClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#0f1520] border-l border-[#1e2d3d] z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d3d] bg-[#111927]">
          <div className="flex items-center gap-3">
            {deploying && (
              <svg className="w-4 h-4 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span className="text-[14px] text-white font-medium">{title}</span>
            {deploying && <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">running</span>}
            {result && <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${result.success ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>{result.success ? 'done' : 'failed'}</span>}
            <span className="text-[11px] font-mono text-gray-500">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="text-[12px] text-gray-500 hover:text-white px-2 py-1 rounded transition-colors duration-150">{copied ? 'Copied' : 'Copy log'}</button>
            <button onClick={handleClose} className="text-gray-500 hover:text-white w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors duration-150">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto p-5 font-mono text-[12px] leading-relaxed text-emerald-300 bg-[#0a1018]">
          {logs.length === 0 && <span className="text-gray-600">Waiting for output...</span>}
          {logs.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all">{line}</div>)}
        </div>
        {result && (
          <div className={`px-5 py-4 border-t border-[#1e2d3d] ${result.success ? 'bg-emerald-950/30' : 'bg-red-950/30'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-[13px] font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>{result.message}</p>
              <span className="text-[11px] font-mono text-gray-500">{formatTime(elapsed)}</span>
            </div>
            {children}
          </div>
        )}
        {deploying && !result && (
          <div className="px-5 py-4 border-t border-[#1e2d3d] flex items-center gap-2 text-[12px] text-gray-500">
            <svg className="w-3.5 h-3.5 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Deploying... {formatTime(elapsed)}
          </div>
        )}
      </div>
    </>
  );
}
