import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend BookResponse (backend/.../api/dto/BookResponse.java). */
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  totalCopies: number;
  availableCopies: number;
  available: boolean;
  category: string;
  genre: string;
  language: string;
  pageCount: number | null;
  rating: number | null;
  cover: string | null;
  publishedYear: number | null;
}

export interface PagedBooks {
  content: BookSummary[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BookQueryFilters {
  search?: string;
  genre?: string;
  language?: string;
  available?: boolean;
  page?: number;
  size?: number;
}

function buildQuery(filters: BookQueryFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.language) params.set("language", filters.language);
  if (filters.available !== undefined) params.set("available", String(filters.available));
  if (filters.page !== undefined) params.set("page", String(filters.page));
  params.set("size", String(filters.size ?? 24));
  return params.toString();
}

export function useBooksQuery(filters: BookQueryFilters = {}) {
  return useQuery({
    queryKey: ["books", filters],
    queryFn: () => api.get<PagedBooks>(`/books?${buildQuery(filters)}`),
  });
}

export function useBookQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["books", "detail", id],
    queryFn: () => api.get<BookSummary>(`/books/${id}`),
    enabled: Boolean(id),
  });
}
