import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-muted">
      <Loader2 className={cn("size-6 animate-spin", className)} aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </span>
  );
}
