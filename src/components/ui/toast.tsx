import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastTone = "success" | "error" | "warning";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ReactNode;
}

interface ToastContextValue {
  toast: (tone: ToastTone, message: string, action?: ReactNode) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const toneStyles: Record<ToastTone, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  error: { icon: XCircle, className: "text-danger" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (tone: ToastTone, message: string, action?: ReactNode) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message, action }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map(({ id, tone, message, action }) => {
          const { icon: Icon, className } = toneStyles[tone];
          return (
            <div
              key={id}
              role="status"
              className="flex items-start gap-3 rounded-(--radius-card) border border-border bg-surface p-4 shadow-lift"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden="true" />
              <div className="flex-1 text-sm">
                <p>{message}</p>
                {action && <div className="mt-2">{action}</div>}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(id)}
                className="rounded p-0.5 text-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
