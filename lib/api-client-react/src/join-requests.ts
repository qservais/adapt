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
