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
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-page-surface border-l border-page-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-page-border bg-page-bg">
          <div className="flex items-center gap-3">
            {deploying && (
              <svg className="w-4 h-4 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span className="text-[14px] text-txt-primary font-medium">{title}</span>
            {deploying && <span className="text-[11px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">running</span>}
            {result && <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${result.success ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{result.success ? 'done' : 'failed'}</span>}
            <span className="text-[11px] font-mono text-txt-muted">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="text-[12px] text-txt-muted hover:text-txt-primary px-2 py-1 rounded transition-colors duration-150">{copied ? 'Copied' : 'Copy log'}</button>
            <button onClick={handleClose} className="text-txt-muted hover:text-txt-primary w-7 h-7 rounded-lg hover:bg-page-bg flex items-center justify-center transition-colors duration-150">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto p-5 font-mono text-[12px] leading-relaxed text-txt-primary bg-page-bg">
          {logs.length === 0 && <span className="text-txt-faint">Waiting for output...</span>}
          {logs.map((line, i) => <div key={i} className="whitespace-pre-wrap break-all">{line}</div>)}
        </div>
        {result && (
          <div className={`px-5 py-4 border-t border-page-border ${result.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-[13px] font-medium ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>{result.message}</p>
              <span className="text-[11px] font-mono text-txt-muted">{formatTime(elapsed)}</span>
            </div>
            {children}
          </div>
        )}
        {deploying && !result && (
          <div className="px-5 py-4 border-t border-page-border flex items-center gap-2 text-[12px] text-txt-muted">
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
