'use client';

import { useEffect, useRef, useState } from 'react';

interface DeployDrawerProps {
  open: boolean;
  title: string;
  logs: string[];
  deploying: boolean;
  result: { success: boolean; message: string } | null;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function DeployDrawer({ open, title, logs, deploying, result, onClose, children }: DeployDrawerProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Browser close/refresh protection while deploying
  useEffect(() => {
    if (!deploying) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Deployment is in progress. Closing this page will interrupt it. Are you sure?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [deploying]);

  const handleClose = () => {
    if (deploying) {
      const confirmed = window.confirm(
        'Deployment is still in progress. Closing this will not stop the process on the server, but you will lose the live log output.\n\nAre you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop — blocks interaction while open */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-surface border-l border-subtle z-50 flex flex-col shadow-2xl shadow-black/50"
        style={{ animation: 'slide-in-right 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle bg-surface">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[13px] font-mono font-medium text-white">{title}</span>
            {deploying && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse-glow" />
                RUNNING
              </span>
            )}
            {result && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                result.success
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-red-400 bg-red-500/10'
              }`}>
                {result.success ? 'DONE' : 'FAILED'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-elevated transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Log
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-elevated transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Log output */}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-[1.8] bg-void relative"
        >
          <div className="absolute inset-0 scanlines" />
          {logs.length === 0 && (
            <span className="text-gray-600 relative z-10">Waiting for output...</span>
          )}
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all text-green-300/90 relative z-10">
              <span className="text-gray-700 select-none mr-3">{String(i + 1).padStart(3, ' ')}</span>
              {line}
            </div>
          ))}
        </div>

        {/* Result footer */}
        {result && (
          <div className={`px-5 py-4 border-t border-subtle ${
            result.success ? 'bg-green-500/5' : 'bg-red-500/5'
          }`}>
            <div className="flex items-center gap-2.5">
              {result.success ? (
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`text-[13px] font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </span>
            </div>
            {children}
          </div>
        )}

        {/* Deploying footer */}
        {deploying && !result && (
          <div className="px-5 py-4 border-t border-subtle bg-surface">
            <div className="flex items-center gap-2.5 text-[12px] text-gray-400">
              <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              Deployment in progress — do not close this page
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
