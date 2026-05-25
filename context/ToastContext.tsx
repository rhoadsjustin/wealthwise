import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss duration in ms. Defaults to 4000; errors default to 5000. */
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (item: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Module-level bridge so imperative callers outside React (showToast.*) can push toasts.
let _addToast: ((item: Omit<ToastItem, 'id'>) => void) | null = null;

export function addToastImperative(item: Omit<ToastItem, 'id'>): void {
  _addToast?.(item);
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `t${Date.now()}-${counter.current++}`;
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register the imperative bridge when the provider mounts.
  useEffect(() => {
    _addToast = addToast;
    return () => {
      _addToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}
