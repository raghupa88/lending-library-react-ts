import { cn } from "../../lib/cn";

interface AvatarProps {
  name: string;
  className?: string;
}

/** Initials avatar — no remote images needed. */
export function Avatar({ name, className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
