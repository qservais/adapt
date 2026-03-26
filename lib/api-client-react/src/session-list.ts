import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { SessionDetail } from "./generated/api.schemas";

export const TODAY_SESSIONS_ALL_QUERY_KEY = ["/api/sessions/today-all"] as const;

export function useGetTodaySessions() {
  return useQuery<SessionDetail[]>({
    queryKey: TODAY_SESSIONS_ALL_QUERY_KEY,
    queryFn: ({ signal }) =>
      customFetch("/api/sessions/today-all", { signal }) as Promise<SessionDetail[]>,
  });
}

export function useInvalidateTodaySessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: TODAY_SESSIONS_ALL_QUERY_KEY });
}
