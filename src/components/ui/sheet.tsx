import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/** Slide-in panel (mobile nav, drawers) built on native <dialog>. */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    // Keyboard dismissal (Esc) is native to <dialog>; this click handler only
    // adds backdrop-click dismissal, so the jsx-a11y pairing rules don't apply.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] border-l border-border bg-surface p-0 text-foreground shadow-lift",
        "ml-auto backdrop:bg-black/40",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-display text-lg font-semibold">{title}</span>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="rounded-(--radius-control) p-1 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
