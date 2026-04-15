'use client';

import { useEffect, useState } from 'react';
import { CircleCheck as CheckCircle, Circle as XCircle, X, Bell } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function AlertToast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const Icon =
    toast.type === 'success'
      ? CheckCircle
      : toast.type === 'error'
      ? XCircle
      : Bell;

  const colorClass =
    toast.type === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : toast.type === 'error'
      ? 'border-red-500/30 bg-red-500/10 text-red-400'
      : 'border-sky-500/30 bg-sky-500/10 text-sky-400';

  return (
    <div
      className={`transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } flex items-start gap-3 p-3 rounded-xl border backdrop-blur-sm bg-slate-900 ${colorClass} shadow-2xl`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
