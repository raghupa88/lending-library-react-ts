import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend NotificationResponse. */
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 30_000;

export function useNotificationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/notifications"),
    enabled,
    refetchInterval: POLL_MS,
  });
}

export function useUnreadCountQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    enabled,
    refetchInterval: POLL_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<Notification>(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
