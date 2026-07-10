import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend FeatureFlagResponse. */
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
}

export interface FeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

/** Public — the currently enabled flag keys, used to gate UI. */
export function useFeatureFlagsQuery() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => api.get<string[]>("/feature-flags"),
    staleTime: 60_000,
  });
}

/** Convenience: `useIsFeatureEnabled("b2b_tier")` — false until the flags have loaded. */
export function useIsFeatureEnabled(key: string): boolean {
  const { data } = useFeatureFlagsQuery();
  return data?.includes(key) ?? false;
}

export function useAdminFeatureFlagsQuery() {
  return useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => api.get<FeatureFlag[]>("/admin/feature-flags"),
  });
}

function invalidateFlags(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
  queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FeatureFlagInput) => api.post<FeatureFlag>("/admin/feature-flags", input),
    onSuccess: () => invalidateFlags(queryClient),
  });
}

export function useSetFeatureFlagEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      api.put<FeatureFlag>(`/admin/feature-flags/${key}`, { enabled }),
    onSuccess: () => invalidateFlags(queryClient),
  });
}
