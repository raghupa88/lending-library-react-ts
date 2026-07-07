import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";

export type BookingStatus = "CONFIRMED" | "WAITLISTED" | "CANCELLED";

/** Matches backend BatchForLearnerResponse. */
export interface BatchForLearner {
  id: string;
  venueName: string;
  city: string;
  instructorName: string;
  startsOn: string;
  endsOn: string;
  scheduleText: string;
  fee: number;
  seatsAvailable: number;
  myBookingStatus: BookingStatus | null;
}

/** Matches backend BookingResponse. */
export interface Booking {
  id: string;
  batchId: string;
  courseTitle: string;
  venueName: string;
  startsOn: string;
  endsOn: string;
  status: BookingStatus;
  bookedAt: string;
  amountPaid: number;
}

export function useCourseBatchesQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: ["learn", "batches", "course", courseId],
    queryFn: () => api.get<BatchForLearner[]>(`/learn/courses/${courseId}/batches`),
    enabled: Boolean(courseId),
  });
}

export function useMyBookingsQuery(enabled = true) {
  return useQuery({
    queryKey: ["learn", "bookings", "mine"],
    queryFn: () => api.get<Booking[]>("/learn/me/bookings"),
    enabled,
  });
}

export function useBookSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, payment }: { batchId: string; payment?: PaymentInput }) =>
      api.post<Booking>(`/learn/batches/${batchId}/book`, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learn", "batches"] });
      queryClient.invalidateQueries({ queryKey: ["learn", "bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => api.del<void>(`/learn/bookings/${bookingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learn", "batches"] });
      queryClient.invalidateQueries({ queryKey: ["learn", "bookings"] });
    },
  });
}
