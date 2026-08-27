import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@palliroute/auth";
import { fetchAuthMe } from "../api/auth";

export function useAuthMe() {
  const { configured, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchAuthMe,
    enabled: !configured || isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    retry: 1,
  });
}
