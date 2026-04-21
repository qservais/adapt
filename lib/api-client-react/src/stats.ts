export interface ExerciseLoadPoint {
  date: string;
  loadKg: number;
  reps?: number;
  sessionId?: string;
}

export interface WeekSummary {
  weekStart: string;
  totalVolume: number;
  sessionCount: number;
}

export interface ExerciseLoadHistory {
  exerciseId: string;
  exerciseName: string;
  points: ExerciseLoadPoint[];
}

export interface WeeklyVolumePoint {
  weekStart: string;
  volume: number;
  sessions: number;
}

export interface WeekComparison {
  thisWeek: WeekSummary;
  lastWeek: WeekSummary;
}

export interface InsertBodyMetricPayload {
  date: string;
  weightKg?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  notes?: string | null;
}
