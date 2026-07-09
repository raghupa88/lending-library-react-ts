import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend ActivityEntryResponse. Empty unless the backend's cassandra profile is active. */
export interface ActivityEntry {
  eventId: string;
  type: string;
  summary: string;
  occurredAt: string;
}

export function useMyActivityQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["activity", "me"],
    queryFn: () => api.get<ActivityEntry[]>("/activity/me"),
    enabled,
  });
}
