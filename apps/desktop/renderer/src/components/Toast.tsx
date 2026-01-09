import * as React from 'react';
import { Toast as RadixToast } from 'radix-ui';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-50',
  error: 'bg-red-500/10 border-red-500/30 text-red-50',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-50',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-50',
};

const toastIconColors = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};

const toastGlow = {
  success: 'shadow-emerald-500/20',
  error: 'shadow-red-500/20',
  warning: 'shadow-amber-500/20',
  info: 'shadow-blue-500/20',
};

function ToastItem({ toast, onClose }: ToastItemProps) {
  const Icon = toastIcons[toast.type];

  return (
    <RadixToast.Root
      className={cn(
        'group pointer-events-auto relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 transition-all',
        'backdrop-blur-xl backdrop-saturate-150',
        'shadow-lg shadow-black/20',
        toastGlow[toast.type],
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        'data-[state=open]:duration-300 data-[state=closed]:duration-200',
        toastStyles[toast.type]
      )}
      duration={toast.duration ?? 3000}
    >
      <Icon
        className={cn('h-4 w-4 flex-shrink-0', toastIconColors[toast.type])}
      />

      <div className="flex-1 min-w-0">
        <RadixToast.Title className="text-xs font-medium leading-none">
          {toast.title}
        </RadixToast.Title>
        {toast.description && (
          <RadixToast.Description className="text-xs opacity-70 leading-none mt-1">
            {toast.description}
          </RadixToast.Description>
        )}
      </div>

      <RadixToast.Close
        className="flex-shrink-0 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
        onClick={() => onClose(toast.id)}
      >
        <X className="h-3 w-3" />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

// Toast 관리를 위한 Context
interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastData = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = React.useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'success', title, description });
    },
    [addToast]
  );

  const error = React.useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'error', title, description, duration: 5000 });
    },
    [addToast]
  );

  const warning = React.useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'warning', title, description, duration: 4000 });
    },
    [addToast]
  );

  const info = React.useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'info', title, description });
    },
    [addToast]
  );

  const value = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, removeToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <RadixToast.Provider swipeDirection="right">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-auto max-w-[320px]" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
