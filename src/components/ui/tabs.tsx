import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface TabItem {
  id: string;
  label: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}

/** WAI-ARIA tabs: roving tabindex, arrow-key navigation. */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = items.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % items.length;
    if (e.key === "ArrowLeft") next = (idx - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(items[next].id);
      listRef.current
        ?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${baseId}-tab-${items[next].id}`)}`)
        ?.focus();
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 rounded-(--radius-control) bg-surface-2 p-1", className)}
    >
      {items.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-[calc(var(--radius-control)-2px)] px-4 py-1.5 text-sm font-medium transition-colors",
              selected ? "bg-surface text-foreground shadow-soft" : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  tabsId,
  id,
  active,
  children,
  className,
}: {
  tabsId?: string;
  id: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={tabsId ? `${tabsId}-panel-${id}` : undefined} className={className}>
      {children}
    </div>
  );
}
