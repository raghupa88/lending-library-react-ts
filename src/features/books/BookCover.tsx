import { useState } from "react";
import { cn } from "../../lib/cn";

interface BookCoverProps {
  title: string;
  author: string;
  cover: string | null;
  className?: string;
}

/** Book cover image with a typographic fallback when no image loads. */
export function BookCover({ title, author, cover, className }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!cover || failed) {
    return (
      <div
        role="img"
        aria-label={`Cover of ${title} by ${author}`}
        className={cn(
          "flex aspect-[2/3] w-full flex-col justify-between rounded-md bg-secondary p-3 text-secondary-foreground shadow-soft",
          className,
        )}
      >
        <span className="font-display text-sm leading-snug font-semibold">{title}</span>
        <span className="text-xs opacity-80">{author}</span>
      </div>
    );
  }

  return (
    <img
      src={cover}
      alt={`Cover of ${title} by ${author}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("aspect-[2/3] w-full rounded-md object-cover shadow-soft", className)}
    />
  );
}
