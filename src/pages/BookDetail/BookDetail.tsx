import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookMarked, Star } from "lucide-react";
import { useBookQuery } from "../../features/books/queries";
import { BookCover } from "../../features/books/BookCover";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useToast } from "../../components/ui/toast";
import { useAuth } from "../../context/AuthContext";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: book, isLoading, isError } = useBookQuery(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBorrow = () => {
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    // Real borrow mutation arrives with the member-core release.
    toast("success", "Borrowing from the app arrives with the member release — stay tuned!");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        to="/books"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to the shelf
      </Link>

      {isLoading && (
        <div className="grid gap-10 md:grid-cols-[280px_1fr]">
          <Skeleton className="aspect-[2/3] w-full max-w-70" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      )}

      {isError && (
        <EmptyState
          title="Book not found"
          description="This book may have been removed from the catalog."
        />
      )}

      {book && (
        <article className="grid gap-10 md:grid-cols-[280px_1fr]">
          <div className="rounded-(--radius-card) bg-surface-2 p-6">
            <BookCover title={book.title} author={book.author} cover={book.cover} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{book.title}</h1>
            <p className="mt-1 text-lg text-muted">by {book.author}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {book.genre && <Badge>{book.genre}</Badge>}
              {book.language && <Badge variant="outline">{book.language}</Badge>}
              {book.pageCount != null && <Badge variant="outline">{book.pageCount} pages</Badge>}
              {book.publishedYear != null && (
                <Badge variant="outline">{book.publishedYear}</Badge>
              )}
              {book.rating != null && (
                <Badge variant="outline">
                  <Star className="size-3 fill-current text-warning" aria-hidden="true" />
                  {book.rating.toFixed(1)}
                </Badge>
              )}
            </div>

            <p className="mt-3">
              {book.available ? (
                <Badge variant="success">
                  {book.availableCopies} of {book.totalCopies} copies on shelf
                </Badge>
              ) : (
                <Badge variant="danger">Currently borrowed out</Badge>
              )}
            </p>

            <div className="mt-6">
              <Button size="lg" disabled={!book.available} onClick={handleBorrow}>
                <BookMarked aria-hidden="true" />
                {book.available ? "Borrow this book" : "Currently unavailable"}
              </Button>
              {!user && book.available && (
                <p className="mt-2 text-sm text-muted">
                  You'll be asked to sign in before borrowing.
                </p>
              )}
            </div>

            {book.description && (
              <p className="mt-6 max-w-prose leading-relaxed text-muted">{book.description}</p>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
