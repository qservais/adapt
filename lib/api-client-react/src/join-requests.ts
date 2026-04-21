import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface CoachSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export interface CoachJoinRequest {
  id: string;
  coachId: string;
  status: string;
  createdAt: string;
  coachFirstName: string;
  coachLastName: string;
}

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

export const COACHES_QUERY_KEY = ["/api/coaches"] as const;
export const COACH_REQUEST_QUERY_KEY = ["/api/athlete/coach-request"] as const;
export const COACH_JOIN_REQUESTS_QUERY_KEY = ["/api/coach/join-requests"] as const;

export function useGetCoaches() {
  return useQuery<CoachSummary[]>({
    queryKey: COACHES_QUERY_KEY,
    queryFn: ({ signal }) => customFetch("/api/coaches", { signal }) as Promise<CoachSummary[]>,
  });
}

export function useGetAthleteCoachRequest() {
  return useQuery<CoachJoinRequest | null>({
    queryKey: COACH_REQUEST_QUERY_KEY,
    queryFn: ({ signal }) => customFetch("/api/athlete/coach-request", { signal }) as Promise<CoachJoinRequest | null>,
  });
}

export function useRequestCoach() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { coachId: string }>({
    mutationFn: ({ coachId }) =>
      customFetch("/api/athlete/request-coach", {
        method: "POST",
        body: JSON.stringify({ coachId }),
      }) as Promise<{ success: boolean }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_REQUEST_QUERY_KEY });
    },
  });
}

export function useCancelCoachRequest() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () =>
      customFetch("/api/athlete/request-coach", {
        method: "DELETE",
      }) as Promise<{ success: boolean }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_REQUEST_QUERY_KEY });
    },
  });
}

export function useGetCoachJoinRequests() {
  return useQuery<CoachJoinRequestItem[]>({
    queryKey: COACH_JOIN_REQUESTS_QUERY_KEY,
    queryFn: ({ signal }) => customFetch("/api/coach/join-requests", { signal }) as Promise<CoachJoinRequestItem[]>,
    refetchInterval: 30000,
  });
}

export function useApproveJoinRequest() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (requestId) =>
      customFetch(`/api/coach/join-requests/${requestId}/approve`, {
        method: "POST",
      }) as Promise<{ success: boolean }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_JOIN_REQUESTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["/api/coach/clients"] });
    },
  });
}

export function useRejectJoinRequest() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (requestId) =>
      customFetch(`/api/coach/join-requests/${requestId}/reject`, {
        method: "POST",
      }) as Promise<{ success: boolean }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_JOIN_REQUESTS_QUERY_KEY });
    },
  });
}
