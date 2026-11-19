import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export type AuthUser = User & { providerId: number | null };
export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"], retry: false, staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Unable to check your sign-in. Please retry.");
      return response.json();
    },
  });
  return { user: data ?? null, providerId: data?.providerId ?? null, isLoading, isAuthenticated: Boolean(data), error };
}
