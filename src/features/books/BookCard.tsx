import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { BookCover } from "./BookCover";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/cn";
import type { BookSummary } from "./queries";

interface BookCardProps {
  book: BookSummary;
  className?: string;
}

export function BookCard({ book, className }: BookCardProps) {
  return (
    <Link
      to={`/books/${book.id}`}
      aria-label={`${book.title} by ${book.author}`}
      className={cn(
        "group flex flex-col rounded-(--radius-card) border border-border bg-surface p-3 shadow-soft transition-shadow hover:shadow-lift",
        className,
      )}
    >
      <BookCover
        title={book.title}
        author={book.author}
        cover={book.cover}
        className="transition-transform group-hover:-translate-y-0.5"
      />
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <div className="leading-snug font-medium">{book.title}</div>
        <div className="text-sm text-muted">{book.author}</div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {book.genre && <Badge variant="outline">{book.genre}</Badge>}
          {book.rating != null && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Star className="size-3.5 fill-current text-warning" aria-hidden="true" />
              <span aria-label={`Rated ${book.rating} out of 5`}>{book.rating.toFixed(1)}</span>
            </span>
          )}
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 text-xs font-medium",
              book.available ? "text-success" : "text-danger",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                book.available ? "bg-success" : "bg-danger",
              )}
            />
            {book.available ? "On shelf" : "Borrowed out"}
          </span>
        </div>
      </div>
    </Link>
  );
}
