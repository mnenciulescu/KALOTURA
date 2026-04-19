'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { create } from 'zustand';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'success') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function Toaster() {
  const { toasts, remove } = useToast();

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[100] flex w-full max-w-[390px] -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 shadow-xl"
          >
            {t.type === 'success' ? (
              <CheckCircle size={16} className="shrink-0 text-[var(--color-primary)]" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-[var(--color-danger)]" />
            )}
            <span className="flex-1 text-sm text-[var(--color-text)]">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
