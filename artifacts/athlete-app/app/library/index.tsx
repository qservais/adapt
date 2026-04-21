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
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import type { LibrarySession, FreeSessionStartResponse } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { setFreeSession } from "@/lib/freeSessionStore";

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
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const [activeCategory, setActiveCategory] = useState<string>("warmup");
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [showAllExercises, setShowAllExercises] = useState(false);

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
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>BIBLIOTHÈQUE</Text>
      </View>

      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        Exercices et routines à consulter ou démarrer librement.
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/library/custom-session" as any)}
        style={styles.createSessionBtn}
        activeOpacity={0.8}
      >
        <View style={styles.createSessionIcon}>
          <Feather name="plus" size={18} color={COLORS.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.createSessionTitle, { fontFamily: FONTS.bodyBold }]}>
            Créer une séance libre
          </Text>
          <Text style={[styles.createSessionSubtitle, { fontFamily: FONTS.body }]}>
            Choisis tes exercices, sets, reps et charge
          </Text>
        </View>
        <Feather name="arrow-right" size={18} color={COLORS.cyan} />
      </TouchableOpacity>

      {athleteExercises.length > 0 && (
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="zap" size={13} color={COLORS.cyan} />
            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodyBold, color: COLORS.cyan }]}>
              MES EXERCICES
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
                {showAllExercises ? "Voir moins" : `Voir les ${athleteExercises.length - 5} autres`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {programSessions.length > 0 && (
        <View style={styles.programSection}>
          <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodyBold }]}>
            ⚡ SÉANCES DU PROGRAMME
          </Text>
          {programSessions.map((s) => {
            const isStarting = startingSessionId === s.sessionId;
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
                <TouchableOpacity
                  onPress={() => handleStartFreeSession(s.sessionId, s.sessionName)}
                  disabled={!!startingSessionId}
                  style={[styles.startBtn, { backgroundColor: COLORS.violet, opacity: startingSessionId ? 0.6 : 1 }]}
                  activeOpacity={0.8}
                >
                  {isStarting ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <Feather name="play" size={13} color={COLORS.bg} />
                  )}
                  <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>
                    {isStarting ? "..." : "Démarrer"}
                  </Text>
                </TouchableOpacity>
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
            Impossible de charger la bibliothèque.
          </Text>
        </View>
      )}

      {filtered.map((routine) => {
        const isStarting = startingRoutineId === routine.id;
        const catColor = activeCat?.color ?? COLORS.cyan;
        return (
          <TouchableOpacity
            key={routine.id}
            style={[styles.card, activeCat && { borderColor: `${activeCat.color}30` }]}
            onPress={() => router.push(`/library/${routine.id}` as any)}
            activeOpacity={0.8}
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
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleStartFree(routine);
                }}
                disabled={!!startingRoutineId}
                style={[
                  styles.startBtn,
                  { backgroundColor: catColor, opacity: startingRoutineId ? 0.6 : 1 },
                ]}
                activeOpacity={0.8}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Feather name="play" size={13} color={COLORS.bg} />
                )}
                <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>
                  {isStarting ? "..." : "Démarrer"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      {!isLoading && filtered.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            Aucune routine disponible dans cette catégorie.
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
});
