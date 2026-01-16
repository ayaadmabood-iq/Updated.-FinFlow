import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast notification data structure
 */
export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast context value
 */
interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook to access toast notifications
 *
 * @example
 * ```tsx
 * const toast = useToast();
 *
 * // Show success toast
 * toast.success('Project created successfully!');
 *
 * // Show error toast
 * toast.error('Failed to save changes', 'Error');
 *
 * // Show toast with action
 * toast.addToast({
 *   type: 'info',
 *   message: 'New version available',
 *   action: { label: 'Update', onClick: () => window.location.reload() }
 * });
 * ```
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * Toast Provider Component
 * Wrap your app with this provider to enable toast notifications
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Keep only the latest maxToasts
        if (updated.length > maxToasts) {
          return updated.slice(updated.length - maxToasts);
        }
        return updated;
      });

      // Auto-dismiss if duration is set
      if (newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [defaultDuration, maxToasts, removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      return addToast({ type: 'success', message, title });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      return addToast({ type: 'error', message, title });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      return addToast({ type: 'info', message, title });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      return addToast({ type: 'warning', message, title });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast Container Component
 * Renders all active toasts in a fixed position
 */
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 right-0 z-50',
        'p-4 pb-safe-bottom pr-safe-right',
        'flex flex-col gap-2',
        'max-w-full sm:max-w-md',
        'pointer-events-none'
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

/**
 * Individual Toast Item Component
 */
interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300); // Wait for exit animation
  };

  const styles = {
    success: {
      bg: 'bg-green-600',
      text: 'text-white',
      icon: <CheckCircle2 className="h-5 w-5 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-destructive',
      text: 'text-destructive-foreground',
      icon: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-blue-600',
      text: 'text-white',
      icon: <Info className="h-5 w-5 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-warning',
      text: 'text-warning-foreground',
      icon: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
    },
  };

  const style = styles[toast.type];

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto',
        'rounded-lg shadow-lg',
        'p-4 pr-12',
        'min-w-[300px] max-w-full',
        style.bg,
        style.text,
        'transition-all duration-300 ease-in-out',
        isExiting
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'
      )}
    >
      <div className="flex items-start gap-3">
        <div aria-hidden="true">{style.icon}</div>

        <div className="flex-1 min-w-0">
          {toast.title && <div className="font-semibold mb-1">{toast.title}</div>}
          <div className="text-sm">{toast.message}</div>

          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                handleRemove();
              }}
              className={cn(
                'mt-2 text-sm font-medium underline',
                'hover:no-underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                'rounded px-1 py-0.5',
                'transition-colors',
                'min-h-touch-target'
              )}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleRemove}
          className={cn(
            'absolute top-2 right-2',
            'p-1.5 rounded',
            'hover:bg-white/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
            'transition-colors',
            'min-h-touch-target min-w-touch-target',
            'flex items-center justify-center'
          )}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Promise-based toast for async operations
 *
 * @example
 * ```tsx
 * const toast = useToast();
 *
 * toast.promise(
 *   saveProject(),
 *   {
 *     loading: 'Saving project...',
 *     success: 'Project saved successfully!',
 *     error: 'Failed to save project',
 *   }
 * );
 * ```
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
  toastContext: ToastContextValue
): Promise<T> {
  const loadingId = toastContext.info(messages.loading);

  try {
    const result = await promise;
    toastContext.removeToast(loadingId);
    toastContext.success(messages.success);
    return result;
  } catch (error) {
    toastContext.removeToast(loadingId);
    toastContext.error(messages.error);
    throw error;
  }
}

/**
 * Extended useToast hook with promise helper
 */
export function useToastWithPromise() {
  const toast = useToast();

  const promise = useCallback(
    <T,>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => {
      const actualPromise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
      return toastPromise(actualPromise, messages, toast);
    },
    [toast]
  );

  return {
    ...toast,
    promise,
  };
}
