import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";
import type { BillingCycle, Subscription } from "../subscriptions/queries";

/** Matches backend GiftSubscriptionResponse. */
export interface GiftSubscription {
  id: string;
  recipientEmail: string;
  plan: string;
  billingCycle: BillingCycle;
  giftCode: string;
  amountPaid: number;
  status: "pending" | "redeemed";
  purchasedAt: string;
  redeemedAt: string | null;
}

export function useMyGiftsQuery(enabled = true) {
  return useQuery({
    queryKey: ["gifts"],
    queryFn: () => api.get<GiftSubscription[]>("/gifts/mine"),
    enabled,
  });
}

export function usePurchaseGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipientEmail,
      plan,
      billingCycle,
      payment,
    }: {
      recipientEmail: string;
      plan: string;
      billingCycle: BillingCycle;
      payment: PaymentInput;
    }) =>
      api.post<GiftSubscription>("/gifts", {
        recipientEmail,
        plan: plan.toUpperCase(),
        billingCycle: billingCycle.toUpperCase(),
        payment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
  });
}

export function useRedeemGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (giftCode: string) => api.post<Subscription>("/gifts/redeem", { giftCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
