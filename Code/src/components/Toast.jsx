import React, { useState, useCallback, useEffect } from 'react';
import { Check, AlertTriangle, Info, Copy } from 'lucide-react';
import { cn } from '../lib/utils';

// Global toast emitter — no context needed. Import showToast() from anywhere.
let _emit = null;

const ICONS = {
  success: <Check size={14} />,
  error: <AlertTriangle size={14} />,
  info: <Info size={14} />,
  copy: <Copy size={14} />,
};

const COLORS = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#0f6cbd',
  copy: '#a78bfa',
};

// Imperative global API
export const showToast = (message, type = 'info', duration = 2500) => {
  if (_emit) _emit(message, type, duration);
};

// Mount this once in the app root
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type, duration) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    _emit = addToast;
    return () => { _emit = null; };
  }, [addToast]);

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-semibold pointer-events-auto animate-toast-in cursor-pointer",
        toast.type === 'success' && 'text-green-200',
        toast.type === 'error' && 'text-red-200',
        toast.type === 'info' && 'text-blue-200',
        toast.type === 'copy' && 'text-purple-200',
      )}
      style={{ backgroundColor: COLORS[toast.type] + '22', border: '1px solid ' + COLORS[toast.type] + '55', backdropFilter: 'blur(12px)' }}
      onClick={() => onRemove(toast.id)}
    >
      <span style={{ color: COLORS[toast.type] }}>{ICONS[toast.type]}</span>
      <span>{toast.message}</span>
    </div>
  );
};

export default ToastContainer;
