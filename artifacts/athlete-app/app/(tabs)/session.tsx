import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  useGetTodaySession,
  useGetSessionHistory,
  useGetTodayCheckin,
  useGetAthleteUpcomingSessions,
  customFetch,
} from "@workspace/api-client-react";
import type { FreeSessionStartResponse, SessionBlockItem, SessionExerciseItem } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { useThemeColors, useFormatWeight } from "@/context/PreferencesContext";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GlowCard } from "@/components/ui/GlowCard";
import { setFreeSession } from "@/lib/freeSessionStore";

interface AthleteProgram {
  id: string;
  name: string;
  durationWeeks: number;
  startDate: string | null;
  isActive: boolean;
  previewEnabled: boolean;
  previewAllowStart: boolean;
  startsInFuture: boolean;
  createdAt?: string;
}

interface ProgramDetail {
  programId: string;
  programName: string;
  startDate: string | null;
  durationWeeks: number;
  isActive: boolean;
  startsInFuture: boolean;
  previewEnabled: boolean;
  previewAllowStart: boolean;
  sessions: {
    sessionId: string;
    name: string;
    type: string;
    weekNumber: number;
    dayNumber: number;
    scheduledDate: string;
    estimatedDurationMin: number | null;
    coachNotes: string | null;
    blocks: { id: string; type: string; name: string | null; orderIndex: number }[];
    exercises: {
      id: string;
      name: string;
      sets: number;
      reps: string | null;
      loadKg: number | null;
      restSeconds: number | null;
      durationSeconds: number | null;
      blockId: string | null;
      orderIndex: number;
      demoUrl: string | null;
      gifUrl: string | null;
    }[];
  }[];
}

type SubTab = "today" | "upcoming" | "history";

const SESSION_TYPE_FR: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hiit: "HIIT",
  mobility: "Mobilité",
  mixed: "Mixte",
  rest: "Repos",
  recovery: "Récupération",
  sport: "Sport",
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  warm_up: "#FB923C",
  strength: "#EF4444",
  power: "#F59E0B",
  conditioning: "#A78BFA",
  core: "#22C55E",
  cool_down: "#00F0FF",
  mobility: "#34D399",
  activation: "#60A5FA",
  technique: "#E879F9",
  plyometric: "#F97316",
  hiit: "#FCD34D",
  superset: "#00F0FF",
  circuit: "#F59E0B",
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warm_up: "ÉCHAUFFEMENT",
  strength: "FORCE",
  power: "PUISSANCE",
  conditioning: "CONDITIONNEMENT",
  core: "GAINAGE",
  cool_down: "RETOUR AU CALME",
  mobility: "MOBILITÉ",
  activation: "ACTIVATION",
  technique: "TECHNIQUE",
  plyometric: "PLIOMÉTRIE",
  hiit: "HIIT",
  superset: "SUPERSET",
  circuit: "CIRCUIT",
};

function groupByBlock(
  exercises: SessionExerciseItem[],
  blocks: SessionBlockItem[]
): { block: SessionBlockItem | null; exercises: SessionExerciseItem[] }[] {
  const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  const blockMap = new Map<string, SessionExerciseItem[]>();
  const unassigned: SessionExerciseItem[] = [];

  for (const ex of exercises) {
    if (ex.blockId) {
      if (!blockMap.has(ex.blockId)) blockMap.set(ex.blockId, []);
      blockMap.get(ex.blockId)!.push(ex);
    } else {
      unassigned.push(ex);
    }
  }

  const result: { block: SessionBlockItem | null; exercises: SessionExerciseItem[] }[] = [];
  for (const block of sortedBlocks) {
    const exs = blockMap.get(block.id) ?? [];
    if (exs.length > 0) result.push({ block, exercises: exs });
  }
  if (unassigned.length > 0) result.push({ block: null, exercises: unassigned });
  return result;
}

export default function SessionTab() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);

  const colors = useThemeColors();
  const formatWeight = useFormatWeight();

  const [activeTab, setActiveTab] = useState<SubTab>("today");
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [quickLogModal, setQuickLogModal] = useState<{ exerciseId: string; sessionExId: string; name: string } | null>(null);
  const [loadInput, setLoadInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [loggingExercise, setLoggingExercise] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState<string | null>(null);
  const [startingProgram, setStartingProgram] = useState(false);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  const checkinQuery = useGetTodayCheckin();
  const sessionQuery = useGetTodaySession();
  const historyQuery = useGetSessionHistory();
  const upcomingQuery = useGetAthleteUpcomingSessions();
  const athleteProgramsQuery = useQuery<AthleteProgram[]>({
    queryKey: ["/api/athlete/programs"],
    queryFn: () => customFetch("/api/athlete/programs") as Promise<AthleteProgram[]>,
  });
  const programDetailQuery = useQuery<ProgramDetail | null>({
    queryKey: ["/api/athlete/programs", expandedProgramId, "preview"],
    queryFn: () => expandedProgramId
      ? customFetch(`/api/athlete/programs/${expandedProgramId}/preview`) as Promise<ProgramDetail>
      : Promise.resolve(null),
    enabled: !!expandedProgramId,
  });

  useFocusEffect(
    useCallback(() => {
      checkinQuery.refetch();
      sessionQuery.refetch();
      upcomingQuery.refetch();
      historyQuery.refetch();
      athleteProgramsQuery.refetch();
    }, [])
  );

  const hasCheckin = checkinQuery.data != null;
  const session = sessionQuery.data;
  const modeKey = (checkinQuery.data?.sessionMode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const exercises = session?.exercises ?? [];
  const blocks = session?.blocks ?? [];
  const grouped = groupByBlock(exercises, blocks);
  const exerciseIndexMap = new Map(exercises.map((ex, i) => [ex.id, i]));

  // Fetch persisted exercise logs to hydrate checked state
  const exerciseLogsQuery = useQuery<{ exerciseId: string }[]>({
    queryKey: ["/api/sessions/exercise-logs", session?.sessionLogId],
    queryFn: () => customFetch(`/api/sessions/${session!.sessionLogId}/exercise-logs`) as Promise<{ exerciseId: string }[]>,
    enabled: !!session?.sessionLogId,
  });

  useEffect(() => {
    if (exerciseLogsQuery.data && exerciseLogsQuery.data.length > 0) {
      const loggedExerciseIds = new Set(exerciseLogsQuery.data.map(l => l.exerciseId));
      setCheckedExercises(prev => {
        // Map exerciseId → session exercise id for hydration
        const next = new Set(prev);
        for (const ex of exercises) {
          if (loggedExerciseIds.has(ex.exerciseId)) {
            next.add(ex.id);
          }
        }
        return next;
      });
    }
  }, [exerciseLogsQuery.data]);

  const completedLogs = historyQuery.data?.filter((l) => l.completedAt != null) ?? [];

  const handleStartFreeSession = async (sessionId: string, sessionName: string) => {
    if (startingSessionId) return;
    setStartingSessionId(sessionId);
    try {
      const data = await customFetch(`/api/sessions/${sessionId}/start-free`, { method: "POST" }) as FreeSessionStartResponse;
      setFreeSession({
        sessionLogId: data.sessionLogId,
        name: data.name,
        mode: data.mode,
        isFreeSession: true,
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

  const handleOpenQuickLog = (sessionExId: string, exerciseId: string, name: string) => {
    setQuickLogModal({ sessionExId, exerciseId, name });
    setLoadInput("");
    setRepsInput("");
  };

  const handleQuickLog = async () => {
    if (!quickLogModal || !session?.sessionLogId || loggingExercise) return;
    setLoggingExercise(true);
    try {
      const load = parseFloat(loadInput);
      const reps = parseInt(repsInput);
      await customFetch(`/api/sessions/${session.sessionLogId}/log-exercise`, {
        method: "POST",
        body: JSON.stringify({
          exerciseId: quickLogModal.exerciseId,
          setsCompleted: 1,
          repsPerSet: !isNaN(reps) ? [reps] : undefined,
          loadKgUsed: !isNaN(load) && load > 0 ? load : undefined,
        }),
      });
      setCheckedExercises(prev => new Set([...prev, quickLogModal.sessionExId]));
      setQuickLogModal(null);
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer l'exercice.");
    } finally {
      setLoggingExercise(false);
    }
  };

  const handleCheckExercise = async (sessionExId: string, exerciseId: string) => {
    const isCurrentlyChecked = checkedExercises.has(sessionExId);
    // Optimistic UI update
    setCheckedExercises(prev => {
      const next = new Set(prev);
      if (next.has(sessionExId)) next.delete(sessionExId);
      else next.add(sessionExId);
      return next;
    });
    // Persist uncheck to server
    if (isCurrentlyChecked && session?.sessionLogId) {
      try {
        await customFetch(`/api/sessions/${session.sessionLogId}/exercise-logs/${exerciseId}`, { method: "DELETE" });
      } catch {
        // Rollback optimistic update on error
        setCheckedExercises(prev => {
          const next = new Set(prev);
          next.add(sessionExId);
          return next;
        });
      }
    }
  };

  const handleStartProgram = (programId: string, programName: string) => {
    Alert.alert(
      "Démarrer ce programme",
      `"${programName}" démarrera aujourd'hui. Les séances seront recalculées depuis maintenant. Continuer ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Démarrer",
          style: "default",
          onPress: async () => {
            setStartingProgram(true);
            try {
              await customFetch(`/api/athlete/programs/${programId}/start-now`, { method: "POST" });
              athleteProgramsQuery.refetch();
              upcomingQuery.refetch();
              setExpandedProgramId(null);
              Alert.alert("C'est parti !", `${programName} démarre aujourd'hui.`);
            } catch {
              Alert.alert("Erreur", "Impossible de démarrer le programme. Réessaie.");
            } finally {
              setStartingProgram(false);
            }
          },
        },
      ]
    );
  };

  const upcomingSessions = upcomingQuery.data ?? [];
  // Show all sessions returned by API (past 3 days + next 7 days), sorted by date
  const futureSessions = upcomingSessions;

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: "today", label: "Aujourd'hui" },
    { id: "upcoming", label: "À venir" },
    { id: "history", label: "Historique" },
  ];

  return (
    <>
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingTop: topPad + (Platform.OS === "web" ? 16 : 52), paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { fontFamily: FONTS.title, color: colors.textPrimary }]}>SÉANCE</Text>

      <View style={styles.tabRow}>
        {SUB_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabLabel,
                { fontFamily: FONTS.bodyMedium },
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "today" && (
        <>
          {!hasCheckin ? (
            <View style={styles.section}>
              <GlowCard glowColor={COLORS.border}>
                <View style={styles.lockState}>
                  <Feather name="lock" size={32} color={COLORS.textMuted} />
                  <Text style={[styles.lockTitle, { fontFamily: FONTS.bodyBold, color: colors.textPrimary }]}>
                    Check-in requis
                  </Text>
                  <Text style={[styles.lockDesc, { fontFamily: FONTS.body }]}>
                    Effectue ton check-in matinal pour débloquer la séance du jour.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/checkin")}
                    style={styles.lockBtn}
                  >
                    <Text style={[styles.lockBtnText, { fontFamily: FONTS.bodyBold }]}>
                      Faire le check-in
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlowCard>
            </View>
          ) : session != null ? (
            <View style={styles.section}>
              <GlowCard glowColor={cfg.color} intensity="medium">
                <View style={styles.sessionMeta}>
                  <ModeBadge mode={modeKey} size="md" glow />
                  {session.estimatedDurationMin != null && (
                    <View style={styles.durationPill}>
                      <Feather name="clock" size={13} color={COLORS.textSecondary} />
                      <Text style={[styles.durationText, { fontFamily: FONTS.mono }]}>
                        {session.estimatedDurationMin} min
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.sessionName, { fontFamily: FONTS.title, color: cfg.color }]}>
                  {session.name}
                </Text>
                <Text style={[styles.exerciseCount, { fontFamily: FONTS.body }]}>
                  {exercises.length} exercice{exercises.length !== 1 ? "s" : ""}
                </Text>

                <View style={styles.exerciseList}>
                  {grouped.map(({ block, exercises: exs }, gi) => {
                    const blockType = block?.type?.toLowerCase() ?? "general";
                    const accentColor = BLOCK_TYPE_COLORS[blockType] ?? COLORS.cyan;
                    const typeLabel = BLOCK_TYPE_LABELS[blockType] ?? blockType.toUpperCase();
                    const blockLabel = block
                      ? (block.name ? `${typeLabel} · ${block.name.toUpperCase()}` : typeLabel)
                      : "PROGRAMME";
                    return (
                    <View key={block?.id ?? "unassigned"} style={gi > 0 ? styles.groupBlock : undefined}>
                      <View style={[styles.blockBanner, { backgroundColor: `${block ? accentColor : COLORS.textMuted}10`, borderBottomColor: `${block ? accentColor : COLORS.textMuted}30` }]}>
                        <View style={[styles.blockBannerDot, { backgroundColor: block ? accentColor : COLORS.textMuted }]} />
                        <Text style={[styles.blockBannerText, { fontFamily: FONTS.mono, color: block ? accentColor : COLORS.textMuted }]}>
                          {blockLabel}
                        </Text>
                      </View>
                      {exs.map((ex, i) => {
                        const globalIndex = exerciseIndexMap.get(ex.id) ?? 0;
                        const isDone = checkedExercises.has(ex.id);
                        return (
                          <View key={ex.id} style={[styles.exRow, i === exs.length - 1 && styles.exRowLast]}> 
                            <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                              {String(globalIndex + 1).padStart(2, "0")}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary, textDecorationLine: isDone ? "line-through" : "none", opacity: isDone ? 0.5 : 1 }]}>
                                {ex.exerciseName}
                              </Text>
                              <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                                {ex.sets}×{ex.reps}
                                {ex.adaptedLoadKg != null ? ` @ ${formatWeight(ex.adaptedLoadKg)}` : ""}
                              </Text>
                              <Text style={[styles.exRest, { fontFamily: FONTS.mono }]}>
                                {(ex.restSeconds ?? 0) > 0
                                  ? `Repos : ${ex.restSeconds}s`
                                  : "Enchaîner"}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                if (isDone) {
                                  handleCheckExercise(ex.id, ex.exerciseId);
                                } else {
                                  handleOpenQuickLog(ex.id, ex.exerciseId, ex.exerciseName);
                                }
                              }}
                              style={[styles.exCheckBtn, isDone && { backgroundColor: `${COLORS.green}20`, borderColor: `${COLORS.green}50` }]}
                              activeOpacity={0.7}
                            >
                              <Feather name={isDone ? "check" : "plus"} size={13} color={isDone ? COLORS.green : COLORS.textMuted} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  );
                  })}
                </View>

                <TouchableOpacity
                  onPress={() => exercises.length > 0 ? router.push("/session") : undefined}
                  style={[
                    styles.startBtn,
                    { backgroundColor: cfg.color },
                    exercises.length === 0 && { backgroundColor: COLORS.border, opacity: 0.5 },
                  ]}
                  disabled={exercises.length === 0}
                >
                  <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>
                    {exercises.length === 0 ? "AUCUN EXERCICE" : "DÉMARRER LA SÉANCE"}
                  </Text>
                  {exercises.length > 0 && <Feather name="arrow-right" size={18} color={COLORS.bg} />}
                </TouchableOpacity>
              </GlowCard>
            </View>
          ) : (
            <View style={styles.section}>
              <GlowCard glowColor={COLORS.border}>
                <View style={styles.lockState}>
                  <Feather name="calendar" size={32} color={COLORS.textMuted} />
                  <Text style={[styles.lockTitle, { fontFamily: FONTS.bodyBold, color: colors.textPrimary }]}>
                    Jour de repos
                  </Text>
                  <Text style={[styles.lockDesc, { fontFamily: FONTS.body }]}>
                    Aucune séance prévue aujourd'hui. La récupération fait partie de l'entraînement.
                  </Text>
                </View>
              </GlowCard>
            </View>
          )}
        </>
      )}

      {activeTab === "upcoming" && (
        <View style={[styles.section, { gap: 16 }]}>
          {(() => {
            const futurePrograms = (athleteProgramsQuery.data ?? []).filter(p => p.startsInFuture);
            const isEmpty = futureSessions.length === 0 && futurePrograms.length === 0;
            if (isEmpty) {
              return (
                <View style={styles.emptyState}>
                  <Feather name="calendar" size={36} color={COLORS.textMuted} />
                  <Text style={[styles.emptyTitle, { fontFamily: FONTS.bodyBold }]}>
                    Aucune séance à venir
                  </Text>
                  <Text style={[styles.emptyDesc, { fontFamily: FONTS.body }]}>
                    Les prochaines séances de ton programme apparaîtront ici.
                  </Text>
                </View>
              );
            }
            return (
              <>
                {futurePrograms.length > 0 && (
                  <View style={{ gap: 12 }}>
                    <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono }]}>PROGRAMMES À VENIR</Text>
                    {futurePrograms.map((prog) => {
                      const isExpanded = expandedProgramId === prog.id;
                      const detail = isExpanded ? programDetailQuery.data : null;
                      const isLoadingDetail = isExpanded && programDetailQuery.isFetching;
                      return (
                        <View key={prog.id} style={[styles.previewCard, { borderColor: `${COLORS.cyan}30` }]}>
                          <TouchableOpacity
                            onPress={() => {
                              setExpandedProgramId(isExpanded ? null : prog.id);
                              setPreviewExpanded(null);
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.previewHeader}>
                              <View style={styles.previewBadge}>
                                <Feather name="calendar" size={11} color={COLORS.cyan} />
                                <Text style={[styles.previewBadgeText, { fontFamily: FONTS.mono }]}>À VENIR</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.previewName, { fontFamily: FONTS.title, color: COLORS.cyan }]} numberOfLines={1}>
                                  {prog.name}
                                </Text>
                                <Text style={[styles.previewMeta, { fontFamily: FONTS.mono }]}>
                                  {prog.startDate
                                    ? `Démarre le ${new Date(prog.startDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · ${prog.durationWeeks} sem.`
                                    : `${prog.durationWeeks} sem.`}
                                </Text>
                              </View>
                              <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                            </View>
                          </TouchableOpacity>

                          {isExpanded && (
                            <>
                              {prog.previewAllowStart && (
                                <TouchableOpacity
                                  onPress={() => handleStartProgram(prog.id, prog.name)}
                                  disabled={startingProgram}
                                  style={[styles.previewStartBtn, { opacity: startingProgram ? 0.6 : 1 }]}
                                  activeOpacity={0.8}
                                >
                                  {startingProgram ? (
                                    <ActivityIndicator size="small" color={COLORS.bg} />
                                  ) : (
                                    <>
                                      <Feather name="play" size={14} color={COLORS.bg} />
                                      <Text style={[styles.previewStartBtnText, { fontFamily: FONTS.bodyMedium }]}>Démarrer maintenant</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}

                              {isLoadingDetail ? (
                                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                                  <ActivityIndicator size="small" color={COLORS.cyan} />
                                </View>
                              ) : detail && detail.sessions.length > 0 ? (
                                <View style={styles.previewSessions}>
                                  {detail.sessions.map((ps) => {
                                    const isExp = previewExpanded === ps.sessionId;
                                    const blockMap = new Map<string | null, typeof ps.exercises>();
                                    for (const ex of ps.exercises) {
                                      const key = ex.blockId ?? null;
                                      if (!blockMap.has(key)) blockMap.set(key, []);
                                      blockMap.get(key)!.push(ex);
                                    }
                                    const sortedBlocks = [...ps.blocks].sort((a, b) => a.orderIndex - b.orderIndex);
                                    const orderedGroups: { blockId: string | null; blockName: string | null; exercises: typeof ps.exercises }[] = [];
                                    for (const b of sortedBlocks) {
                                      const exs = blockMap.get(b.id) ?? [];
                                      if (exs.length > 0) orderedGroups.push({ blockId: b.id, blockName: b.name, exercises: exs });
                                    }
                                    const noBlockExs = blockMap.get(null) ?? [];
                                    if (noBlockExs.length > 0) orderedGroups.push({ blockId: null, blockName: null, exercises: noBlockExs });

                                    return (
                                      <View key={ps.sessionId} style={{ gap: 0 }}>
                                        <TouchableOpacity
                                          onPress={() => setPreviewExpanded(isExp ? null : ps.sessionId)}
                                          style={styles.previewSessionRow}
                                          activeOpacity={0.8}
                                        >
                                          <View style={styles.previewSessionLeft}>
                                            <Text style={[styles.previewWeekLabel, { fontFamily: FONTS.mono }]}>
                                              {`S${ps.weekNumber}·J${ps.dayNumber}`}
                                            </Text>
                                            <View style={{ flex: 1 }}>
                                              <Text style={[styles.previewSessionName, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]} numberOfLines={1}>
                                                {ps.name}
                                              </Text>
                                              {ps.estimatedDurationMin != null && (
                                                <Text style={[styles.previewSessionMeta, { fontFamily: FONTS.mono }]}>
                                                  {ps.estimatedDurationMin} min · {ps.exercises.length} exos
                                                </Text>
                                              )}
                                            </View>
                                          </View>
                                          <Feather name={isExp ? "chevron-up" : "chevron-down"} size={14} color={COLORS.textMuted} />
                                        </TouchableOpacity>
                                        {isExp && (
                                          <View style={styles.previewExList}>
                                            {orderedGroups.map((group, gi) => (
                                              <View key={group.blockId ?? `noblock-${gi}`}>
                                                {group.blockName != null && (
                                                  <Text style={[styles.previewBlockHeader, { fontFamily: FONTS.mono }]}>
                                                    {group.blockName.toUpperCase()}
                                                  </Text>
                                                )}
                                                {group.exercises.map((ex, ei) => (
                                                  <Text key={ex.id} style={[styles.previewExItem, { fontFamily: FONTS.body }]}>
                                                    {`${String(ei + 1).padStart(2, "0")}  ${ex.name}  ${ex.sets}×${ex.reps ?? "-"}${ex.loadKg ? ` @ ${formatWeight(ex.loadKg)}` : ""}`}
                                                  </Text>
                                                ))}
                                              </View>
                                            ))}
                                          </View>
                                        )}
                                      </View>
                                    );
                                  })}
                                </View>
                              ) : detail && detail.sessions.length === 0 ? (
                                <Text style={[styles.previewMeta, { fontFamily: FONTS.mono, paddingTop: 8, textAlign: "center" }]}>
                                  Aucune séance configurée pour ce programme.
                                </Text>
                              ) : null}
                            </>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {futureSessions.length > 0 && (
                  <>
                    {futurePrograms.length > 0 && (
                      <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono }]}>SÉANCES DU PROGRAMME EN COURS</Text>
                    )}
                    <GlowCard glowColor={COLORS.border}>
                      {futureSessions.map((s, i) => {
                        const d = new Date(s.scheduledDate + "T12:00:00");
                        const dayLabel = d.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        });
                        const typeLabel = SESSION_TYPE_FR[s.sessionType] ?? s.sessionType;
                        return (
                          <View
                            key={s.sessionId}
                            style={[
                              styles.upcomingRow,
                              i === futureSessions.length - 1 && styles.upcomingRowLast,
                              s.isCompleted && { opacity: 0.7 },
                            ]}
                          >
                            <View style={styles.upcomingDayCol}>
                              <Text style={[styles.upcomingDay, { fontFamily: FONTS.mono }]}>
                                {dayLabel}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.upcomingName, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {s.sessionName}
                              </Text>
                              {s.isCompleted && s.completedActualDate ? (
                                <Text style={[styles.upcomingDoneLabel, { fontFamily: FONTS.mono }]}>
                                  {s.completedActualDate !== s.scheduledDate
                                    ? `Faite le ${new Date(s.completedActualDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au lieu du ${new Date(s.scheduledDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                                    : `Faite le ${new Date(s.completedActualDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                                </Text>
                              ) : s.isPreview ? (
                                <Text style={[styles.upcomingType, { fontFamily: FONTS.mono, color: `${COLORS.cyan}80` }]}>
                                  {`Aperçu · ${typeLabel}`}
                                </Text>
                              ) : (
                                <Text style={[styles.upcomingType, { fontFamily: FONTS.mono }]}>
                                  {typeLabel}
                                </Text>
                              )}
                            </View>
                            {s.estimatedDurationMin != null && !s.isCompleted && (
                              <Text style={[styles.upcomingDuration, { fontFamily: FONTS.mono }]}>
                                {s.estimatedDurationMin} min
                              </Text>
                            )}
                            {s.isCompleted ? (
                              <View style={styles.upcomingDoneIcon}>
                                <Feather name="check-circle" size={18} color={COLORS.green} />
                              </View>
                            ) : s.isPreview ? (
                              <View style={[styles.upcomingDoneIcon, { opacity: 0.5 }]}>
                                <Feather name="lock" size={16} color={COLORS.cyan} />
                              </View>
                            ) : !s.isAppointment ? (
                              <TouchableOpacity
                                onPress={() => handleStartFreeSession(s.sessionId, s.sessionName)}
                                disabled={!!startingSessionId}
                                style={[
                                  styles.upcomingStartBtn,
                                  { opacity: startingSessionId ? 0.5 : 1 },
                                ]}
                                activeOpacity={0.8}
                              >
                                {startingSessionId === s.sessionId ? (
                                  <ActivityIndicator size="small" color={COLORS.bg} />
                                ) : (
                                  <Feather name="play" size={13} color={COLORS.bg} />
                                )}
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      })}
                    </GlowCard>
                  </>
                )}
              </>
            );
          })()}
        </View>
      )}

      {activeTab === "history" && (
        <View style={styles.section}>
          {completedLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="clock" size={36} color={COLORS.textMuted} />
              <Text style={[styles.emptyTitle, { fontFamily: FONTS.bodyBold }]}>
                Aucune séance terminée
              </Text>
              <Text style={[styles.emptyDesc, { fontFamily: FONTS.body }]}>
                Tes séances complétées apparaîtront ici.
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {completedLogs.map((log) => {
                const mode = log.variantMode as SessionMode;
                const c = MODE_CONFIG[mode] ?? MODE_CONFIG.normal;
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.historyRow}
                    onPress={() =>
                      router.push({
                        pathname: "/session/detail/[logId]",
                        params: { logId: log.id },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={[styles.historyDot, { backgroundColor: log.isFreeSession ? COLORS.cyan : c.color }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.historyTitleRow}>
                        <Text
                          style={[styles.historyMode, { fontFamily: FONTS.bodyMedium, color: log.isFreeSession ? COLORS.cyan : c.color }]}
                          numberOfLines={1}
                        >
                          {log.sessionName ?? c.label}
                        </Text>
                        {log.isFreeSession && (
                          <View style={styles.freeSessionBadge}>
                            <Feather name="zap" size={9} color={COLORS.cyan} />
                            <Text style={[styles.freeSessionBadgeText, { fontFamily: FONTS.mono }]}>LIBRE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.historyDate, { fontFamily: FONTS.mono }]}>
                        {log.completedAt != null
                          ? new Date(log.completedAt).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })
                          : "En cours"}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      {log.rpe != null && (
                        <Text style={[styles.rpe, { fontFamily: FONTS.mono }]}>
                          RPE {log.rpe}
                        </Text>
                      )}
                      {log.durationMin != null && (
                        <Text style={[styles.duration, { fontFamily: FONTS.mono }]}>
                          {log.durationMin} min
                        </Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>

    {/* Quick Log Modal */}
    <Modal visible={quickLogModal != null} transparent animationType="fade" onRequestClose={() => setQuickLogModal(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setQuickLogModal(null)} />
        <View style={styles.modalCard}>
          <Text style={[styles.modalTitle, { fontFamily: FONTS.title, color: colors.textPrimary }]} numberOfLines={2}>
            {quickLogModal?.name}
          </Text>
          <Text style={[styles.modalSubtitle, { fontFamily: FONTS.mono }]}>ENREGISTREMENT RAPIDE</Text>
          <View style={styles.modalInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { fontFamily: FONTS.mono }]}>CHARGE (KG)</Text>
              <TextInput
                style={[styles.modalInput, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}
                value={loadInput}
                onChangeText={setLoadInput}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={COLORS.textMuted}
                selectTextOnFocus
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { fontFamily: FONTS.mono }]}>REPS</Text>
              <TextInput
                style={[styles.modalInput, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}
                value={repsInput}
                onChangeText={setRepsInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                selectTextOnFocus
              />
            </View>
          </View>
          <TouchableOpacity
            onPress={handleQuickLog}
            disabled={loggingExercise}
            style={[styles.modalConfirmBtn, { opacity: loggingExercise ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {loggingExercise ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <>
                <Feather name="check" size={16} color={COLORS.bg} />
                <Text style={[styles.modalConfirmText, { fontFamily: FONTS.bodyMedium }]}>Valider</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setQuickLogModal(null)} style={styles.modalCancelBtn}>
            <Text style={[styles.modalCancelText, { fontFamily: FONTS.body }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenTitle: {
    fontSize: 44,
    letterSpacing: 5,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: COLORS.cyan + "20",
    borderWidth: 1,
    borderColor: COLORS.cyan + "50",
  },
  tabLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.cyan,
  },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  lockState: { alignItems: "center", gap: 12, padding: 12 },
  lockTitle: { fontSize: 18 },
  lockDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  lockBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  lockBtnText: { fontSize: 15, color: COLORS.bg },
  sessionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: { fontSize: 12, color: COLORS.textSecondary },
  sessionName: { fontSize: 38, letterSpacing: 2, lineHeight: 42, marginBottom: 4 },
  exerciseCount: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  exerciseList: { gap: 0, marginBottom: 24 },
  groupBlock: { marginTop: 12 },
  blockBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    marginBottom: 4,
    gap: 7,
  },
  blockBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  blockBannerText: {
    fontSize: 9,
    letterSpacing: 2,
  },
  exRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exRowLast: { borderBottomWidth: 0 },
  exNum: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, minWidth: 24 },
  exName: { fontSize: 15, marginBottom: 2 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 1 },
  exRest: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  startBtnText: { fontSize: 15, letterSpacing: 1.5, color: COLORS.bg },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 17, color: COLORS.textSecondary },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  upcomingRowLast: { borderBottomWidth: 0 },
  upcomingDayCol: { minWidth: 90 },
  upcomingDay: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: "capitalize" },
  upcomingName: { fontSize: 14, marginBottom: 2 },
  upcomingType: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  upcomingDuration: { fontSize: 11, color: COLORS.textSecondary },
  upcomingStartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  historyList: { gap: 0 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  historyTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  historyMode: { fontSize: 14, marginBottom: 2 },
  historyDate: { fontSize: 11, color: COLORS.textMuted },
  freeSessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${COLORS.cyan}15`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}40`,
    marginBottom: 2,
  },
  freeSessionBadgeText: { fontSize: 9, color: COLORS.cyan, letterSpacing: 1 },
  historyRight: { alignItems: "flex-end", gap: 2 },
  rpe: { fontSize: 12, color: COLORS.amber },
  duration: { fontSize: 11, color: COLORS.textMuted },
  exCheckBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.white}05`,
    marginLeft: 8,
  },
  upcomingDoneLabel: {
    fontSize: 10,
    color: COLORS.green,
    letterSpacing: 0.5,
  },
  upcomingDoneIcon: {
    marginLeft: 8,
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.textMuted,
    marginBottom: -4,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: COLORS.bgCard,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${COLORS.cyan}15`,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
  },
  previewBadgeText: {
    fontSize: 9,
    color: COLORS.cyan,
    letterSpacing: 1.5,
  },
  previewName: {
    fontSize: 15,
    color: COLORS.cyan,
  },
  previewMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  previewSessions: {
    paddingVertical: 8,
  },
  previewSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}50`,
  },
  previewSessionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewWeekLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    width: 36,
  },
  previewSessionName: {
    fontSize: 13,
  },
  previewSessionMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  previewExList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: `${COLORS.white}03`,
    gap: 4,
  },
  previewBlockHeader: {
    fontSize: 9,
    color: COLORS.cyan,
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 2,
    paddingLeft: 4,
  },
  previewExItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingVertical: 3,
  },
  previewStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cyan,
  },
  previewStartBtnText: {
    fontSize: 14,
    color: COLORS.bg,
  },
  previewMore: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalSubtitle: {
    fontSize: 9,
    color: COLORS.cyan,
    letterSpacing: 2,
    marginTop: -8,
  },
  modalInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: `${COLORS.white}08`,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    textAlign: "center",
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  modalConfirmText: {
    fontSize: 16,
    color: COLORS.bg,
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
