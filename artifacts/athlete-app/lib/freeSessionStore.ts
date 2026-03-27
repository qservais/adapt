interface FreeSessionData {
  sessionLogId: string;
  name: string;
  mode: string;
  isFreeSession: boolean;
  isRoutine?: boolean;
  routineId?: string | null;
  adaptScore: number;
  coachNotes: string | null;
  estimatedDurationMin: number | null;
  exercises: Array<{
    id: string;
    exerciseId: string;
    exerciseName: string;
    category: string | null;
    imageUrl: string | null;
    gifUrl: string | null;
    muscleGroups: unknown;
    equipment: unknown;
    description: string | null;
    demoUrl: string | null;
    orderIndex: number;
    sets: number;
    reps: string | null;
    nominalLoadKg: number | null;
    adaptedLoadKg: number | null;
    restSeconds: number | null;
    durationSeconds: number | null;
    coachCue: string | null;
    tempo: string | null;
    lastUsedLoadKg: number | null;
    lastUsedDate: string | null;
  }>;
  athletePRs?: Record<string, number>;
}

let _current: FreeSessionData | null = null;

export function setFreeSession(data: FreeSessionData): void {
  _current = data;
}

export function getFreeSession(): FreeSessionData | null {
  return _current;
}

export function clearFreeSession(): void {
  _current = null;
}
