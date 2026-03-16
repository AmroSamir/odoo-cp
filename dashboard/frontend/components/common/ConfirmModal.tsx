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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-md w-full max-w-md">
        <div className="p-5">
          <h3 className="text-[15px] font-medium text-white mb-2">{title}</h3>
          <p className="text-zinc-400 text-[13px] mb-4">{message}</p>

          {confirmText && (
            <div className="mb-4">
              <p className="text-[12px] text-zinc-500 mb-1">
                Type <code className="text-white font-mono bg-zinc-800 px-1 rounded text-[12px]">{confirmText}</code> to confirm
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-[13px] text-white font-mono placeholder-zinc-600"
                placeholder={confirmText}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[13px] rounded-md border border-zinc-700 text-zinc-400 hover:text-white transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-3 py-1.5 text-[13px] rounded-md font-medium transition-colors duration-150 disabled:opacity-30 ${
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent hover:bg-accent-hover text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
