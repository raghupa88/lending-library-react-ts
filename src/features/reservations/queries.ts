import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Loan } from "../loans/queries";

/** Matches backend ReservationResponse (backend/.../api/dto/ReservationResponse.java). */
export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCover: string | null;
  status: "WAITING" | "READY_FOR_PICKUP" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  reservedAt: string;
  holdExpiresAt: string | null;
}

export function useMyReservationsQuery(enabled = true) {
  return useQuery({
    queryKey: ["reservations"],
    queryFn: () => api.get<Reservation[]>("/reservations"),
    enabled,
  });
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => api.post<Reservation>("/reservations", { bookId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => api.del<void>(`/reservations/${reservationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useClaimReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => api.post<Loan>(`/reservations/${reservationId}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}
