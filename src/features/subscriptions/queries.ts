import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";

/** Matches backend SubscriptionPlanResponse. */
export interface Plan {
  id: string;
  name: string;
  price: number;
  maxBooks: number;
  features: string[];
  popular: boolean;
}

/** Matches backend SubscriptionResponse. */
export interface Subscription {
  id: string;
  plan: string;
  monthlyPrice: number;
  startDate: string;
  endDate: string | null;
  status: string;
  maxConcurrentLoans: number;
  pausedUntil: string | null;
}

/** The backend uses Integer.MAX_VALUE for unlimited plans. */
export function formatMaxBooks(maxBooks: number): string {
  return maxBooks > 1000 ? "Unlimited books" : `${maxBooks} books at a time`;
}

export function usePlansQuery() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/subscriptions/plans"),
    staleTime: 5 * 60_000,
  });
}

export function useCurrentSubscriptionQuery(enabled = true) {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        return await api.get<Subscription>("/subscriptions/current");
      } catch (err) {
        // No active subscription is a normal state, not an error
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled,
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    // Backend expects the enum name (BASIC/STANDARD/PREMIUM/FAMILY)
    mutationFn: (planId: string) =>
      api.post<Subscription>("/subscriptions", { plan: planId.toUpperCase() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Subscription>("/subscriptions/pause"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Subscription>("/subscriptions/resume"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
