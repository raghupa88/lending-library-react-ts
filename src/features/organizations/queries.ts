import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";
import type { BillingCycle, Subscription } from "../subscriptions/queries";

/** Matches backend OrganizationMemberResponse. */
export interface OrganizationMember {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
}

/** Matches backend OrganizationResponse. */
export interface Organization {
  id: string;
  name: string;
  plan: string;
  billingCycle: BillingCycle;
  seatsTotal: number;
  seatsUsed: number;
  joinCode: string;
  amountPaid: number;
  createdAt: string;
  members: OrganizationMember[];
}

export function useMyOrganizationQuery(enabled = true) {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      try {
        return await api.get<Organization>("/organizations/mine");
      } catch (err) {
        // No business account yet is a normal state, not an error
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled,
  });
}

export function usePurchaseOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      plan,
      billingCycle,
      seatCount,
      payment,
    }: {
      name: string;
      plan: string;
      billingCycle: BillingCycle;
      seatCount: number;
      payment: PaymentInput;
    }) =>
      api.post<Organization>("/organizations", {
        name,
        plan: plan.toUpperCase(),
        billingCycle: billingCycle.toUpperCase(),
        seatCount,
        payment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useJoinOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (joinCode: string) => api.post<Subscription>("/organizations/join", { joinCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.del<void>(`/organizations/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}
