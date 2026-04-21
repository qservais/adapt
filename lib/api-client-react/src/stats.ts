import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ExerciseLoadPoint {
  date: string;
  loadKg: number;
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

export interface WeekSummary {
  sessions: number;
  avgRpe: number | null;
  totalDurationMin: number;
}

export interface WeekComparison {
  thisWeek: WeekSummary;
  lastWeek: WeekSummary;
}

export interface BodyMetric {
  id: string;
  athleteId: string;
  date: string;
  weightKg: string | null;
  waistCm: string | null;
  hipsCm: string | null;
  chestCm: string | null;
  armCm: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export function useGetExerciseLoadHistory(days = 30) {
  return useQuery<{ exercises: ExerciseLoadHistory[] }>({
    queryKey: ["/api/stats/exercise-load-history", days],
    queryFn: ({ signal }) =>
      customFetch(`/api/stats/exercise-load-history?days=${days}`, { signal }) as Promise<{ exercises: ExerciseLoadHistory[] }>,
  });
}

export function useGetWeeklyVolume(weeks = 8) {
  return useQuery<{ weeks: WeeklyVolumePoint[] }>({
    queryKey: ["/api/stats/weekly-volume", weeks],
    queryFn: ({ signal }) =>
      customFetch(`/api/stats/weekly-volume?weeks=${weeks}`, { signal }) as Promise<{ weeks: WeeklyVolumePoint[] }>,
  });
}

export function useGetWeekComparison() {
  return useQuery<WeekComparison>({
    queryKey: ["/api/stats/week-comparison"],
    queryFn: ({ signal }) =>
      customFetch("/api/stats/week-comparison", { signal }) as Promise<WeekComparison>,
  });
}

export function useGetBodyMetrics(limit = 30) {
  return useQuery<{ metrics: BodyMetric[] }>({
    queryKey: ["/api/stats/body-metrics", limit],
    queryFn: ({ signal }) =>
      customFetch(`/api/stats/body-metrics?limit=${limit}`, { signal }) as Promise<{ metrics: BodyMetric[] }>,
  });
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

export function useAddBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InsertBodyMetricPayload) =>
      customFetch("/api/stats/body-metrics", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as Promise<{ metric: BodyMetric }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stats/body-metrics"] });
    },
  });
}

export function useDeleteBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      customFetch(`/api/stats/body-metrics/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/stats/body-metrics"] });
    },
  });
}
