import type { SessionDetail } from "./generated/api.schemas";

export interface FreeSessionStartResponse extends SessionDetail {
  isFreeSession: boolean;
  overriddenByCoach: boolean;
  sessionsToday: number;
  sessionsTodayCompleted: number;
  sessionIndex: number;
}

export interface LibrarySession {
  sessionId: string;
  sessionName: string;
  sessionType: string;
  sessionLocation: string;
  weekNumber: number;
  dayNumber: number;
  estimatedDurationMin?: number | null;
}
