import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; message: string; title: string };

type ToastContextValue = {
  toast: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = Date.now() + Math.random();
      const defaultTitle = type === 'success' ? 'Success' : type === 'error' ? 'System Alert' : 'Information';
      setToasts((t) => [...t, { id, type, message, title: title || defaultTitle }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value: ToastContextValue = {
    toast,
    success: (m, t) => toast('success', m, t),
    error: (m, t) => toast('error', m, t),
    info: (m, t) => toast('info', m, t),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3.5 w-[calc(100%-2.5rem)] max-w-sm">
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : Info;
          
          const accentColor =
            t.type === 'success'
              ? 'text-emerald-500'
              : t.type === 'error'
                ? 'text-rose-500'
                : 'text-sky-500';

          const cardTheme =
            t.type === 'success'
              ? 'border-l-emerald-500 shadow-emerald-100/40 border-slate-100'
              : t.type === 'error'
                ? 'border-l-rose-500 shadow-rose-100/40 border-slate-100'
                : 'border-l-sky-500 shadow-sky-100/40 border-slate-100';

          const progressBg =
            t.type === 'success'
              ? 'bg-emerald-500'
              : t.type === 'error'
                ? 'bg-rose-500'
                : 'bg-sky-500';

          return (
            <div
              key={t.id}
              className={`relative overflow-hidden flex items-start gap-3 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-l-4 ${cardTheme} p-4 animate-[slideIn_0.2s_ease-out]`}
            >
              {/* Left Icon */}
              <div className="shrink-0 mt-0.5">
                <Icon className={`w-5 h-5 ${accentColor}`} />
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-0.5">{t.title}</h4>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">{t.message}</p>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => remove(t.id)} 
                className="shrink-0 text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1 rounded-lg transition-colors -mt-1 -mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Animated Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-50">
                <div className={`h-full ${progressBg} animate-[shrink_4s_linear_forwards]`} />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
