import type { SessionDetail } from "./generated/api.schemas";

export interface FreeSessionStartResponse extends SessionDetail {
  isFreeSession: boolean;
  overriddenByCoach: boolean;
  sessionsToday: number;
  sessionsTodayCompleted: number;
  sessionIndex: number;
}
