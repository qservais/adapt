import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import type { LibrarySession, FreeSessionStartResponse } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { setFreeSession } from "@/lib/freeSessionStore";
import { useT } from "@/context/PreferencesContext";

interface AthleteExercise {
  id: string;
  name: string;
  category: string | null;
  muscleGroups: string[] | null;
  equipment: string[] | null;
  description: string | null;
  demoUrl: string | null;
  level: string | null;
}

const EXERCISE_CATEGORY_LABELS: Record<string, string> = {
  compound: "Polyarticulaire",
  isolation: "Isolation",
  cardio: "Cardio",
  mobility: "Mobilité",
  core: "Gainage",
  power: "Puissance",
  plyometric: "Pliométrie",
  force: "Force",
  réathlétisation: "Réathlétisation",
  pliométrie: "Pliométrie",
  mobilité: "Mobilité",
};

interface Routine {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number | null;
  exercises: { name: string; sets?: string; notes?: string }[];
}

interface UserRoutineExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  loadKg?: number | null;
  restSeconds?: number | null;
}

interface UserRoutine {
  id: string;
  name: string;
  exercises: UserRoutineExercise[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: { key: string; label: string; icon: React.ComponentProps<typeof Feather>["name"]; color: string; emoji: string }[] = [
  { key: "warmup", label: "Échauffements", icon: "zap", color: COLORS.amber, emoji: "🔥" },
  { key: "mobility", label: "Mobilité", icon: "rotate-cw", color: "#00D4FF", emoji: "🔄" },
  { key: "activation", label: "Activation", icon: "radio", color: "#FF6B35", emoji: "⚡" },
  { key: "stretching", label: "Étirements", icon: "feather", color: "#A78BFA", emoji: "🧘" },
  { key: "reathletisation", label: "Réathlétisation", icon: "activity", color: COLORS.cyan, emoji: "🫀" },
  { key: "relaxation", label: "Relaxation", icon: "moon", color: COLORS.violet, emoji: "🌙" },
  { key: "breathing", label: "Respiration", icon: "wind", color: COLORS.green, emoji: "🍃" },
];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const [activeCategory, setActiveCategory] = useState<string>("warmup");
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [startingUserRoutineId, setStartingUserRoutineId] = useState<string | null>(null);
  const [showAllExercises, setShowAllExercises] = useState(false);

  const { data: userRoutines = [] } = useQuery<UserRoutine[]>({
    queryKey: ["/api/user-routines"],
    queryFn: () => customFetch("/api/user-routines") as Promise<UserRoutine[]>,
  });

  const handleStartUserRoutine = async (r: UserRoutine) => {
    if (startingUserRoutineId) return;
    setStartingUserRoutineId(r.id);
    try {
      const data = await customFetch(`/api/user-routines/${r.id}/start-free`, {
        method: "POST",
      }) as FreeSessionStartResponse;
      setFreeSession({
        sessionLogId: data.sessionLogId,
        name: data.name,
        mode: data.mode,
        isFreeSession: true,
        isRoutine: false,
        routineId: null,
        adaptScore: data.adaptScore ?? 50,
        coachNotes: data.coachNotes ?? null,
        estimatedDurationMin: data.estimatedDurationMin ?? null,
        exercises: data.exercises ?? [],
        athletePRs: data.athletePRs ?? {},
      });
      router.push("/session/free");
    } catch {
      Alert.alert("Erreur", "Impossible de démarrer cette routine. Réessaie.");
    } finally {
      setStartingUserRoutineId(null);
    }
  };

  const handleDeleteUserRoutine = (r: UserRoutine) => {
    Alert.alert(
      "Supprimer la routine ?",
      `« ${r.name} » sera définitivement supprimée.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await customFetch(`/api/user-routines/${r.id}`, { method: "DELETE" });
              await queryClient.invalidateQueries({ queryKey: ["/api/user-routines"] });
            } catch {
              Alert.alert("Erreur", "Impossible de supprimer la routine.");
            }
          },
        },
      ],
    );
  };

  const { data: routines, isLoading, error } = useQuery<Routine[]>({
    queryKey: ["/api/content-routines"],
    queryFn: () => customFetch("/api/content-routines"),
  });

  const { data: programSessions = [] } = useQuery<LibrarySession[]>({
    queryKey: ["/api/athlete/library-sessions"],
    queryFn: () => customFetch("/api/athlete/library-sessions") as Promise<LibrarySession[]>,
  });

  const { data: athleteExercises = [] } = useQuery<AthleteExercise[]>({
    queryKey: ["/api/athlete/exercises"],
    queryFn: () => customFetch("/api/athlete/exercises") as Promise<AthleteExercise[]>,
  });

  const visibleExercises = showAllExercises ? athleteExercises : athleteExercises.slice(0, 5);

  const filtered = (routines ?? []).filter(r => r.category === activeCategory);
  const activeCat = CATEGORIES.find(c => c.key === activeCategory);

  const handleStartFreeSession = async (sessionId: string, sessionName: string) => {
    if (startingSessionId) return;
    setStartingSessionId(sessionId);
    try {
      const data = await customFetch(`/api/sessions/${sessionId}/start-free`, {
        method: "POST",
      }) as FreeSessionStartResponse;
      setFreeSession({
        sessionLogId: data.sessionLogId,
        name: data.name,
        mode: data.mode,
        isFreeSession: true,
        isRoutine: false,
        routineId: null,
        adaptScore: data.adaptScore ?? 50,
        coachNotes: data.coachNotes ?? null,
        estimatedDurationMin: data.estimatedDurationMin ?? null,
        exercises: data.exercises ?? [],
        athletePRs: data.athletePRs ?? {},
      });
      router.push("/session/free");
    } catch {
      Alert.alert("Erreur", "Impossible de démarrer cette séance. Réessaie.");
    } finally {
      setStartingSessionId(null);
    }
  };

  const handleStartFree = async (routine: Routine) => {
    if (startingRoutineId) return;
    if (routine.exercises.length === 0) {
      Alert.alert("Aucun exercice", "Cette routine ne contient aucun exercice.");
      return;
    }
    setStartingRoutineId(routine.id);
    try {
      const data = await customFetch(`/api/routines/${routine.id}/start-free`, {
        method: "POST",
      }) as FreeSessionStartResponse;
      setFreeSession({
        sessionLogId: data.sessionLogId,
        name: data.name,
        mode: data.mode,
        isFreeSession: true,
        isRoutine: true,
        routineId: routine.id,
        adaptScore: data.adaptScore ?? 50,
        coachNotes: data.coachNotes ?? null,
        estimatedDurationMin: data.estimatedDurationMin ?? null,
        exercises: data.exercises ?? [],
        athletePRs: data.athletePRs ?? {},
      });
      router.push("/session/free");
    } catch {
      Alert.alert("Erreur", "Impossible de démarrer cette routine. Réessaie.");
    } finally {
      setStartingRoutineId(null);
    }
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 40,
        paddingHorizontal: 20,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("library_uc", "BIBLIOTHÈQUE")}</Text>
      </View>

      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        {t("library_subtitle", "Exercices et routines à consulter.")}
      </Text>

      {/* "Créer une séance libre" (custom-session.tsx entry point) is hidden
          for V1 — free/custom sessions are out of scope per the client-
          validated spec. custom-session.tsx itself is left untouched. */}

      {athleteExercises.length > 0 && (
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="zap" size={13} color={COLORS.cyan} />
            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodyBold, color: COLORS.cyan }]}>
              {t("my_exercises_uc", "MES EXERCICES")}
            </Text>
          </View>
          {visibleExercises.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => router.push(`/library/exercise/${ex.id}` as any)}
              style={styles.exerciseCard}
              activeOpacity={0.8}
            >
              <View style={styles.exerciseCardLeft}>
                <Text style={[styles.exerciseCardName, { fontFamily: FONTS.bodyBold }]} numberOfLines={1}>
                  {ex.name}
                </Text>
                <View style={styles.exerciseCardMeta}>
                  {ex.category != null && (
                    <Text style={[styles.exerciseCardCategory, { fontFamily: FONTS.mono }]}>
                      {EXERCISE_CATEGORY_LABELS[ex.category] ?? ex.category}
                    </Text>
                  )}
                  {(ex.muscleGroups ?? []).slice(0, 2).map(mg => (
                    <View key={mg} style={styles.exerciseCardTag}>
                      <Text style={[styles.exerciseCardTagText, { fontFamily: FONTS.mono }]}>{mg}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
          {athleteExercises.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowAllExercises(v => !v)}
              style={styles.showMoreBtn}
            >
              <Feather name={showAllExercises ? "chevron-up" : "chevron-down"} size={14} color={COLORS.cyan} />
              <Text style={[styles.showMoreText, { fontFamily: FONTS.body, color: COLORS.cyan }]}>
                {showAllExercises ? t("see_less", "Voir moins") : t("see_others", "Voir les {0} autres").replace("{0}", String(athleteExercises.length - 5))}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {userRoutines.length > 0 && (
        <View style={styles.userRoutineSection}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="bookmark" size={13} color={COLORS.amber} />
            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodyBold, color: COLORS.amber }]}>
              MES ROUTINES
            </Text>
          </View>
          {userRoutines.map((r) => {
            return (
              <View key={r.id} style={styles.userRoutineCard}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.programCardName, { fontFamily: FONTS.bodyBold }]} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={[styles.programCardMeta, { fontFamily: FONTS.mono }]}>
                    {r.exercises.length} exercice{r.exercises.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteUserRoutine(r)}
                  style={styles.userRoutineDeleteBtn}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={15} color={COLORS.textMuted} />
                </TouchableOpacity>
                {/* "Démarrer" (free-session start) hidden for V1 — see
                    handleStartUserRoutine, kept but unused, out of scope. */}
              </View>
            );
          })}
        </View>
      )}

      {programSessions.length > 0 && (
        <View style={styles.programSection}>
          <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodyBold }]}>
            ⚡ {t("program_sessions_uc", "SÉANCES DU PROGRAMME")}
          </Text>
          {programSessions.map((s) => {
            return (
              <View key={s.sessionId} style={styles.programCard}>
                <View style={styles.programCardInfo}>
                  <Text style={[styles.programCardName, { fontFamily: FONTS.bodyBold }]}>
                    {s.sessionName}
                  </Text>
                  {s.estimatedDurationMin != null && (
                    <Text style={[styles.programCardMeta, { fontFamily: FONTS.mono }]}>
                      {s.estimatedDurationMin} min · J{s.dayNumber} S{s.weekNumber}
                    </Text>
                  )}
                </View>
                {/* "Démarrer" (free-session start) hidden for V1 — see
                    handleStartFreeSession, kept but unused, out of scope. */}
              </View>
            );
          })}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabs}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                styles.categoryTab,
                active && { borderColor: cat.color, backgroundColor: `${cat.color}18` },
              ]}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  { fontFamily: FONTS.bodyMedium, color: active ? cat.color : COLORS.textMuted },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} />
        </View>
      )}

      {error != null && (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
            {t("library_load_error", "Impossible de charger la bibliothèque.")}
          </Text>
        </View>
      )}

      {filtered.map((routine) => {
        return (
          <View
            key={routine.id}
            style={[styles.card, activeCat && { borderColor: `${activeCat.color}30` }]}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { fontFamily: FONTS.bodyBold }]}>
                  {routine.title}
                </Text>
                {routine.durationMin != null && (
                  <View style={[styles.durationBadge, activeCat && { borderColor: `${activeCat.color}40` }]}>
                    <Feather name="clock" size={11} color={activeCat?.color ?? COLORS.textMuted} />
                    <Text style={[styles.durationText, { fontFamily: FONTS.mono, color: activeCat?.color ?? COLORS.textMuted }]}>
                      {routine.durationMin} min
                    </Text>
                  </View>
                )}
              </View>
              {routine.description != null && (
                <Text style={[styles.cardDesc, { fontFamily: FONTS.body }]} numberOfLines={2}>
                  {routine.description}
                </Text>
              )}
            </View>
            <View style={styles.cardFooter}>
              <Text style={[styles.exerciseCount, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                {routine.exercises.length} exercice{routine.exercises.length !== 1 ? "s" : ""}
              </Text>
              {/* "Démarrer" (free-session start) hidden for V1 — see
                  handleStartFree, kept but unused, out of scope. */}
            </View>
          </View>
        );
      })}

      {!isLoading && filtered.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            {t("no_routine_in_category", "Aucune routine disponible dans cette catégorie.")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 28, color: COLORS.white, letterSpacing: 3 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  categoryTabs: { flexDirection: "row", gap: 8, paddingRight: 4 },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13 },
  center: { alignItems: "center", paddingVertical: 40 },
  errorBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  cardTop: { gap: 6 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 15, color: COLORS.white, flex: 1 },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationText: { fontSize: 11 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exerciseCount: { fontSize: 12, letterSpacing: 0.5 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  startBtnText: { fontSize: 13, color: COLORS.bg },
  emptyBox: { paddingVertical: 32, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  exercisesSection: { gap: 8 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  exerciseCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  exerciseCardLeft: { flex: 1, gap: 4 },
  exerciseCardName: { fontSize: 14, color: COLORS.white },
  exerciseCardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  exerciseCardCategory: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5 },
  exerciseCardTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
    backgroundColor: `${COLORS.cyan}10`,
  },
  exerciseCardTagText: { fontSize: 10, color: COLORS.textMuted },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
  },
  showMoreText: { fontSize: 13 },
  programSection: { gap: 10 },
  sectionLabel: { fontSize: 11, color: COLORS.violet, letterSpacing: 1.5, marginBottom: 2 },
  programCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${COLORS.violet}30`,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  programCardInfo: { flex: 1, gap: 3 },
  programCardName: { fontSize: 14, color: COLORS.white },
  programCardMeta: { fontSize: 12, color: COLORS.textMuted },
  createSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: `${COLORS.cyan}40`,
    padding: 16,
  },
  createSessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.cyan}15`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
  },
  createSessionTitle: { fontSize: 14, color: COLORS.white },
  createSessionSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  userRoutineSection: { gap: 10 },
  userRoutineCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${COLORS.amber}40`,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userRoutineDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
