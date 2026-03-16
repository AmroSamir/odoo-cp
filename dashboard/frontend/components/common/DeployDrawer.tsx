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

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!deploying) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Deployment is in progress. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [deploying]);

  const handleClose = () => {
    if (deploying) {
      const confirmed = window.confirm('Deployment is still running. You will lose the live log output. Continue?');
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
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-white">{title}</span>
            {deploying && <span className="text-[11px] font-mono text-yellow-400">running</span>}
            {result && (
              <span className={`text-[11px] font-mono ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'done' : 'failed'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-[12px] text-zinc-500 hover:text-white px-2 py-1 transition-colors duration-150"
            >
              {copied ? 'Copied' : 'Copy log'}
            </button>
            <button
              onClick={handleClose}
              className="text-zinc-500 hover:text-white text-[16px] px-1 transition-colors duration-150"
            >
              x
            </button>
          </div>
        </div>

        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed text-green-300 bg-zinc-950"
        >
          {logs.length === 0 && <span className="text-zinc-600">Waiting for output...</span>}
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))}
        </div>

        {result && (
          <div className={`px-4 py-3 border-t border-zinc-800 ${result.success ? 'bg-green-950/20' : 'bg-red-950/20'}`}>
            <p className={`text-[13px] ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.message}
            </p>
            {children}
          </div>
        )}

        {deploying && !result && (
          <div className="px-4 py-3 border-t border-zinc-800 text-[12px] text-zinc-500">
            Deployment in progress...
          </div>
        )}
      </div>
    </>
  );
}
