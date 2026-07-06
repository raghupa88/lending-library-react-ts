import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationRead,
  type Notification,
} from "./queries";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/empty-state";
import { cn } from "../../lib/cn";

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Navbar bell: unread badge + a dropdown feed, polled every 30s. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useUnreadCountQuery(true);
  const { data: notifications } = useNotificationsQuery(open);
  const markRead = useMarkNotificationRead();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
  };

  const count = unread?.count ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-(--radius-control) p-2 text-muted hover:bg-surface-2 hover:text-foreground"
      >
        <Bell className="size-5" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications feed"
          className="absolute right-0 z-40 mt-2 w-80 max-w-[85vw] rounded-(--radius-card) border border-border bg-surface p-2 shadow-lift"
        >
          {!notifications ? (
            <p className="p-3 text-sm text-muted">Loading…</p>
          ) : notifications.length === 0 ? (
            <EmptyState
              className="border-none p-4"
              icon={<Bell aria-hidden="true" />}
              title="No notifications yet"
              description="Borrow a book or change your plan to see updates here."
            />
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-(--radius-control) p-2.5 text-left text-sm hover:bg-surface-2",
                      !n.read && "bg-accent/5",
                    )}
                  >
                    <span className="flex w-full items-center gap-2 font-medium">
                      {!n.read && (
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-accent"
                        />
                      )}
                      {n.title}
                      {!n.read && <Badge variant="accent" className="ml-auto">New</Badge>}
                    </span>
                    {n.body && <span className="text-muted">{n.body}</span>}
                    <span className="text-xs text-muted">{formatRelative(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
