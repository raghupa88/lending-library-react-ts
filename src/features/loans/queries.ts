import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend LoanResponse (backend/.../api/dto/LoanResponse.java). */
export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string | null;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: "ACTIVE" | "RETURNED" | "OVERDUE";
}

export const DEFAULT_LOAN_DAYS = 14;

export function useMyLoansQuery(enabled = true) {
  return useQuery({
    queryKey: ["loans"],
    queryFn: () => api.get<Loan[]>("/loans"),
    enabled,
  });
}

export function useBorrowBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) =>
      api.post<Loan>("/loans", { bookId, daysToKeep: DEFAULT_LOAN_DAYS }),
    onSuccess: () => {
      // Availability counts change on the book and catalog too
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useReturnBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => api.put<Loan>(`/loans/${loanId}/return`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/** Days until due (negative = overdue). */
export function daysUntilDue(loan: Loan): number {
  const due = new Date(loan.dueDate).getTime();
  return Math.ceil((due - Date.now()) / 86_400_000);
}
