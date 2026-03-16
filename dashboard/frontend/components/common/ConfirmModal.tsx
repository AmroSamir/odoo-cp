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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface border border-subtle rounded-xl w-full max-w-md animate-slide-up shadow-2xl shadow-black/50">
        <div className="p-6">
          <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">{message}</p>

          {confirmText && (
            <div className="mb-5">
              <p className="text-[11px] text-gray-500 mb-2">
                Type <code className="text-white font-mono bg-elevated px-1.5 py-0.5 rounded text-[11px]">{confirmText}</code> to confirm
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full bg-void border border-subtle rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-gray-600"
                placeholder={confirmText}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-subtle text-gray-400 hover:text-white hover:border-gray-500 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent hover:bg-accent-glow text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
