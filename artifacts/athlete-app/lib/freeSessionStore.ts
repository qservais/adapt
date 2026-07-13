export interface CompletedExerciseEntry {
  exerciseId: string;
  setsCompleted: number;
  loadKgUsed: number | null;
}

export interface FreeSessionBlock {
  id: string;
  type: string;
  orderIndex: number;
  name?: string | null;
  notes?: string | null;
  estimatedDurationMin?: number | null;
  conditioningFormat?: string | null;
}

export interface FreeSessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category?: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  muscleGroups?: unknown;
  equipment?: unknown;
  description?: string | null;
  demoUrl?: string | null;
  orderIndex: number;
  sets: number;
  reps?: string | null;
  nominalLoadKg?: number | null;
  adaptedLoadKg?: number | null;
  restSeconds?: number | null;
  durationSeconds?: number | null;
  coachCue?: string | null;
  tempo?: string | null;
  lastUsedLoadKg?: number | null;
  lastUsedDate?: string | null;
  lastUsedRepsPerSet?: number[] | null;
  blockId?: string | null;
  supersetGroup?: string | null;
  supersetLabel?: string | null;
}

export interface FreeSessionData {
  sessionLogId: string;
  name: string;
  mode: string;
  isFreeSession: boolean;
  isSingleExercise?: boolean;
  isRoutine?: boolean;
  routineId?: string | null;
  adaptScore: number;
  coachNotes: string | null;
  estimatedDurationMin: number | null;
  exercises: FreeSessionExercise[];
  blocks?: FreeSessionBlock[];
  athletePRs?: Record<string, number>;
  completedExercises?: CompletedExerciseEntry[];
}

let _current: FreeSessionData | null = null;

export function setFreeSession(data: FreeSessionData): void {
  _current = data;
}

export function getFreeSession(): FreeSessionData | null {
  return _current;
}

export function addCompletedExercise(entry: CompletedExerciseEntry): void {
  if (!_current) return;
  const existing = _current.completedExercises ?? [];
  const idx = existing.findIndex(e => e.exerciseId === entry.exerciseId);
  if (idx >= 0) {
    existing[idx] = entry;
    _current.completedExercises = [...existing];
  } else {
    _current.completedExercises = [...existing, entry];
  }
}

export function clearFreeSession(): void {
  _current = null;
}
