import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { PaymentInput } from "../../lib/payment";

/** Matches backend OrderResponse (backend/.../api/dto/OrderResponse.java) — status is lowercased server-side. */
export interface Order {
  id: string;
  totalAmount: number;
  status: "pending" | "completed" | "failed";
  notes: string | null;
  createdAt: string;
}

export function useMyOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Order[]>("/orders"),
    enabled,
  });
}

export function usePayOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payment }: { orderId: string; payment: PaymentInput }) =>
      api.post<Order>(`/orders/${orderId}/pay`, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
