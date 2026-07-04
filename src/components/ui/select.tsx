import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <span className="relative inline-flex w-full">
      <select
        ref={ref}
        className={cn(
          "h-10 w-full appearance-none rounded-(--radius-control) border border-border bg-surface pr-9 pl-3 text-sm text-foreground",
          "focus-visible:border-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </span>
  ),
);
Select.displayName = "Select";
