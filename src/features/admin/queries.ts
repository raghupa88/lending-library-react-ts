import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { BookSummary } from "../books/queries";

/** Matches backend AdminUserResponse. */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  plan: string | null;
  activeLoans: number;
  joinedAt: string | null;
}

/** Matches backend AdminLoanResponse. */
export interface AdminLoan {
  id: string;
  bookId: string;
  bookTitle: string;
  memberName: string;
  memberEmail: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
}

/** Matches backend TrendingBookResponse. Empty unless the backend's cassandra profile is active. */
export interface TrendingBook {
  bookId: string;
  title: string;
  author: string;
  borrowCount: number;
}

/** Matches backend BookRequest (note: coverUrl here, cover in responses). */
export interface BookInput {
  title: string;
  author: string;
  isbn: string;
  description?: string;
  totalCopies: number;
  purchasePrice: number;
  category?: string;
  language?: string;
  pageCount?: number | null;
  rating?: number | null;
  coverUrl?: string;
  publishedYear?: number | null;
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });
}

export function useAdminLoansQuery(status?: string) {
  return useQuery({
    queryKey: ["admin", "loans", status ?? "all"],
    queryFn: () =>
      api.get<AdminLoan[]>(`/admin/loans${status ? `?status=${status}` : ""}`),
  });
}

export function useTrendingBooksQuery() {
  return useQuery({
    queryKey: ["admin", "books", "trending"],
    queryFn: () => api.get<TrendingBook[]>("/admin/books/trending"),
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookInput) => api.post<BookSummary>("/admin/books", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BookInput }) =>
      api.put<BookSummary>(`/admin/books/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}
