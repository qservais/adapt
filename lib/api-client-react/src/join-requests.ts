import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface CoachJoinRequestItem {
  id: string;
  status: string;
  createdAt: string;
  athleteId: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteEmail: string;
  athleteAvatarUrl: string | null;
  athleteFitnessLevel: string | null;
  athletePrimaryGoal: string | null;
}

export interface CoachSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string | null;
  athleteCount: number;
}

export interface CoachRequest {
  id: string;
  coachId: string;
  athleteId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  coachFirstName: string | null;
  coachLastName: string | null;
  coach?: CoachSummary;
}

export const COACHES_QUERY_KEY = ["/api/coaches"] as const;
export const COACH_REQUEST_QUERY_KEY = ["/api/athlete/coach-request"] as const;
export const COACH_JOIN_REQUESTS_QUERY_KEY = ["/api/coach/join-requests"] as const;

export function useGetCoaches() {
  return useQuery<CoachSummary[]>({
    queryKey: COACHES_QUERY_KEY,
    queryFn: ({ signal }) =>
      customFetch("/api/coaches", { signal }) as Promise<CoachSummary[]>,
  });
}

export function useRequestCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { coachId: string }) =>
      customFetch("/api/athlete/coach-request", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as Promise<CoachRequest>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_REQUEST_QUERY_KEY });
    },
  });
}

export function useGetAthleteCoachRequest() {
  return useQuery<CoachRequest | null>({
    queryKey: COACH_REQUEST_QUERY_KEY,
    queryFn: ({ signal }) =>
      customFetch("/api/athlete/coach-request", { signal }) as Promise<CoachRequest | null>,
  });
}

export function useCancelCoachRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch("/api/athlete/coach-request", { method: "DELETE" }) as Promise<void>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_REQUEST_QUERY_KEY });
    },
  });
}
