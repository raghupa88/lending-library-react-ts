import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchX, Search } from "lucide-react";
import { useBooksQuery } from "../../features/books/queries";
import { BookCard } from "../../features/books/BookCard";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useDebounce } from "../../lib/useDebounce";
import { cn } from "../../lib/cn";

const GENRES = ["Fiction", "Historical Fiction", "Non-Fiction", "Self-Help", "Technology"];
const LANGUAGES = ["English", "Tamil"];
const PAGE_SIZE = 24;

export default function Books() {
  const [params, setParams] = useSearchParams();
  const genre = params.get("genre") ?? "";
  const language = params.get("language") ?? "";
  const availableOnly = params.get("available") === "true";
  const page = Math.max(0, Number(params.get("page") ?? "0") || 0);

  // Search input is local state, debounced into the URL so typing doesn't
  // spam history or the API.
  const [searchInput, setSearchInput] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebounce(searchInput.trim());

  useEffect(() => {
    setParams(
      (prev) => {
        // No-op when the URL already matches, so this effect never clobbers
        // unrelated param changes (e.g. pagination) on mount.
        if ((prev.get("search") ?? "") === debouncedSearch) return prev;
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set("search", debouncedSearch);
        else next.delete("search");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setParams]);

  const updateParam = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  };

  const setPage = (nextPage: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextPage > 0) next.set("page", String(nextPage));
      else next.delete("page");
      return next;
    });
  };

  const { data, isLoading, isError } = useBooksQuery({
    search: debouncedSearch || undefined,
    genre: genre || undefined,
    language: language || undefined,
    available: availableOnly || undefined,
    page,
    size: PAGE_SIZE,
  });

  const books = data?.content ?? [];
  const hasFilters = Boolean(debouncedSearch || genre || language || availableOnly);

  const clearFilters = () => {
    setSearchInput("");
    setParams({}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">The shelf</h1>
        <p className="mt-1 text-muted" aria-live="polite">
          {data
            ? `${data.totalElements} book${data.totalElements === 1 ? "" : "s"}${hasFilters ? " match your filters" : " in the catalog"}`
            : "Loading the catalog…"}
        </p>
      </div>

      {/* Toolbar */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <Input
              type="search"
              aria-label="Search books by title or author"
              placeholder="Search by title or author…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter by genre"
              value={genre}
              onChange={(e) => updateParam("genre", e.target.value)}
              className="w-44"
            >
              <option value="">All genres</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by language"
              value={language}
              onChange={(e) => updateParam("language", e.target.value)}
              className="w-36"
            >
              <option value="">All languages</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
            <button
              type="button"
              role="switch"
              aria-checked={availableOnly}
              onClick={() => updateParam("available", availableOnly ? "" : "true")}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                availableOnly
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted hover:text-foreground",
              )}
            >
              Available now
            </button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[2/3] w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/2" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          className="mt-8"
          icon={<SearchX aria-hidden="true" />}
          title="Couldn't load the shelf"
          description="Something went wrong talking to the library. Try again in a moment."
        />
      ) : books.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<SearchX aria-hidden="true" />}
          title="No books match"
          description="Try a different search or loosen the filters."
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => (
              <li key={book.id}>
                <BookCard book={book} className="h-full" />
              </li>
            ))}
          </ul>

          {data && data.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={!data.hasPrev}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {data.currentPage + 1} of {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!data.hasNext}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
