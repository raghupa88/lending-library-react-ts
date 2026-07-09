import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Matches backend UserResponse. */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  address: string | null;
  referralCode: string | null;
  referralCreditBalance: number;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.get<UserProfile>(`/users/${userId}`),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api.put<UserProfile>(`/users/${userId}`, input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", userId], profile);
    },
  });
}
