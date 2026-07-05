import { type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
}

export function StatCard({ label, value, icon, tone = "default", className }: StatCardProps) {
  return (
    <Card className={cn("flex items-center gap-4 p-5", className)}>
      {icon && (
        <div
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
            tone === "danger" ? "bg-danger/15 text-danger" : "bg-surface-2 text-accent",
          )}
        >
          {icon}
        </div>
      )}
      <div>
        <div className={cn("font-display text-2xl font-semibold", tone === "danger" && "text-danger")}>
          {value}
        </div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </Card>
  );
}
