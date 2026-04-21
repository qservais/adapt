import { useQueryClient } from "@tanstack/react-query";

export const TODAY_SESSIONS_ALL_QUERY_KEY = ["/api/sessions/today-all"] as const;

export function useInvalidateTodaySessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: TODAY_SESSIONS_ALL_QUERY_KEY });
}
