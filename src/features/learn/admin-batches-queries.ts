import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { BookingStatus } from "./batches-queries";

/** Matches backend VenueResponse. */
export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string;
  capacityDefault: number;
}

/** Matches backend VenueRequest. */
export interface VenueInput {
  name: string;
  address?: string;
  city: string;
  capacityDefault: number;
}

/** Matches backend AdminBatchSummaryResponse. */
export interface AdminBatchSummary {
  id: string;
  venueName: string;
  instructorName: string;
  startsOn: string;
  endsOn: string;
  scheduleText: string;
  capacity: number;
  fee: number;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  confirmedCount: number;
  waitlistedCount: number;
}

/** Matches backend SessionResponse. */
export interface Session {
  id: string;
  sessionDate: string;
  topic: string;
}

/** Matches backend RosterEntryResponse. */
export interface RosterEntry {
  bookingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: BookingStatus;
  bookedAt: string;
}

/** Matches backend AdminBatchDetailResponse. */
export interface AdminBatchDetail extends Omit<AdminBatchSummary, "confirmedCount" | "waitlistedCount"> {
  sessions: Session[];
  roster: RosterEntry[];
}

export interface SessionInput {
  sessionDate: string;
  topic: string;
}

/** Matches backend BatchRequest. */
export interface BatchInput {
  venueId: string;
  instructorName: string;
  startsOn: string;
  endsOn: string;
  scheduleText: string;
  capacity: number;
  fee: number;
  sessions: SessionInput[];
}

export function useVenuesQuery() {
  return useQuery({
    queryKey: ["admin", "learn", "venues"],
    queryFn: () => api.get<Venue[]>("/admin/learn/venues"),
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VenueInput) => api.post<Venue>("/admin/learn/venues", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "learn", "venues"] }),
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VenueInput }) =>
      api.put<Venue>(`/admin/learn/venues/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "learn", "venues"] }),
  });
}

export function useAdminCourseBatchesQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "learn", "batches", "course", courseId],
    queryFn: () => api.get<AdminBatchSummary[]>(`/admin/learn/courses/${courseId}/batches`),
    enabled: Boolean(courseId),
  });
}

export function useAdminBatchQuery(batchId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "learn", "batches", "detail", batchId],
    queryFn: () => api.get<AdminBatchDetail>(`/admin/learn/batches/${batchId}`),
    enabled: Boolean(batchId),
  });
}

function invalidateBatches(queryClient: ReturnType<typeof useQueryClient>, courseId?: string) {
  queryClient.invalidateQueries({ queryKey: ["admin", "learn", "batches"] });
  queryClient.invalidateQueries({ queryKey: ["learn", "batches"] });
  if (courseId) {
    queryClient.invalidateQueries({ queryKey: ["admin", "learn", "batches", "course", courseId] });
  }
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, input }: { courseId: string; input: BatchInput }) =>
      api.post<AdminBatchSummary>(`/admin/learn/courses/${courseId}/batches`, input),
    onSuccess: (_, { courseId }) => invalidateBatches(queryClient, courseId),
  });
}

export function usePublishBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      api.put<AdminBatchSummary>(`/admin/learn/batches/${batchId}/publish`),
    onSuccess: () => invalidateBatches(queryClient),
  });
}

export function useCancelBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      api.put<AdminBatchSummary>(`/admin/learn/batches/${batchId}/cancel`),
    onSuccess: () => invalidateBatches(queryClient),
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      userId,
      present,
    }: {
      sessionId: string;
      userId: string;
      present: boolean;
      batchId: string;
    }) => api.put<void>(`/admin/learn/sessions/${sessionId}/attendance`, { userId, present }),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learn", "batches", "detail", batchId] });
    },
  });
}
