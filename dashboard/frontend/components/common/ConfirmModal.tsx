'use client';

import { useState } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  title, message, confirmText, confirmLabel = 'Confirm', onConfirm, onCancel, danger = true,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const canConfirm = !confirmText || typed === confirmText;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-page-surface border border-page-border rounded-2xl w-full max-w-md shadow-modal">
        <div className="p-6">
          <h3 className="text-[16px] font-semibold text-txt-primary mb-2">{title}</h3>
          <p className="text-txt-secondary text-[14px] mb-5">{message}</p>
          {confirmText && (
            <div className="mb-5">
              <p className="text-[13px] text-txt-secondary mb-2">Type <code className="text-txt-primary font-mono bg-page-bg px-1.5 py-0.5 rounded text-[12px]">{confirmText}</code> to confirm</p>
              <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} className="w-full bg-page-bg border border-page-border rounded-lg px-3 py-2.5 text-[14px] text-txt-primary font-mono placeholder-txt-faint" placeholder={confirmText} autoFocus />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onCancel} className="px-4 py-2 text-[13px] rounded-lg border border-page-border text-txt-secondary hover:text-txt-primary hover:bg-page-bg transition-colors duration-150">Cancel</button>
          <button onClick={onConfirm} disabled={!canConfirm} className={`px-4 py-2 text-[13px] rounded-lg font-medium transition-colors duration-150 disabled:opacity-30 ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-accent hover:bg-accent-hover text-white'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
