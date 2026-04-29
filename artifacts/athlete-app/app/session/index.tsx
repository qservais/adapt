import React from "react";
import { getGenericErrorMessage } from "@/lib/errors";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useGetTodaySession,
  useStartSession,
  useGetTodayCheckin,
  useCompleteSession,
  equipmentLabelFromKey,
} from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GradientButton } from "@/components/ui/GradientButton";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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

const LOAD_RATIO: Record<string, number> = {
  adapt: 0.775,
  recovery: 0.20,
  performance: 1.025,
  normal: 1.0,
};

function getAdaptExplanation(mode: string, score: number): string {
  if (mode === "recovery") {
    return `Score ADAPT ${score} — ton corps a besoin de récupérer, charges très réduites.`;
  }
  if (score <= 40) return `Score ADAPT ${score} — état physique faible, charges adaptées.`;
  if (score <= 60) return `Score ADAPT ${score} — légère fatigue détectée, charges allégées.`;
  return `Score ADAPT ${score} — entraînement modéré recommandé.`;
}

interface AdaptBannerProps {
  mode: SessionMode;
  adaptScore: number;
  exercises: Array<{
    id: string;
    exerciseName: string;
    nominalLoadKg?: number | null;
    adaptedLoadKg?: number | null;
  }>;
}

function AdaptBanner({ mode, adaptScore, exercises }: AdaptBannerProps) {
  const [expanded, setExpanded] = React.useState(false);
  const cfg = MODE_CONFIG[mode];
  const ratio = LOAD_RATIO[mode] ?? 1.0;
  const pct = Math.round(ratio * 100);
  const explanation = getAdaptExplanation(mode, adaptScore);

  const loadExercises = exercises.filter(
    (ex) => (ex.nominalLoadKg != null && ex.nominalLoadKg > 0) || (ex.adaptedLoadKg != null && ex.adaptedLoadKg > 0)
  );

  return (
    <View style={[adaptStyles.container, { borderColor: `${cfg.color}50`, backgroundColor: `${cfg.color}10` }]}>
      <View style={adaptStyles.topRow}>
        <View style={[adaptStyles.modeDot, { backgroundColor: cfg.color }]} />
        <View style={adaptStyles.textGroup}>
          <Text style={[adaptStyles.pct, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
            Charges à {pct}%
          </Text>
          <Text style={[adaptStyles.explanation, { fontFamily: FONTS.body }]}>
            {explanation}
          </Text>
        </View>
        {loadExercises.length > 0 && (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={adaptStyles.chevronBtn}>
            <Text style={[adaptStyles.detailText, { fontFamily: FONTS.body, color: cfg.color }]}>
              {expanded ? "Masquer" : "Voir le détail"}
            </Text>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={cfg.color}
            />
          </TouchableOpacity>
        )}
      </View>

      {expanded && loadExercises.length > 0 && (
        <View style={adaptStyles.tableContainer}>
          <View style={[adaptStyles.tableHeader, { borderBottomColor: `${cfg.color}30` }]}>
            <Text style={[adaptStyles.tableHLabel, { fontFamily: FONTS.mono, flex: 1 }]}>EXERCICE</Text>
            <Text style={[adaptStyles.tableHLabel, { fontFamily: FONTS.mono, width: 64, textAlign: "center" }]}>PRÉVU</Text>
            <Text style={[adaptStyles.tableHLabel, { fontFamily: FONTS.mono, width: 64, textAlign: "center", color: cfg.color }]}>ADAPTÉ</Text>
          </View>
          {loadExercises.map((ex) => (
            <View key={ex.id} style={adaptStyles.tableRow}>
              <Text
                style={[adaptStyles.tableExName, { fontFamily: FONTS.body, flex: 1 }]}
                numberOfLines={1}
              >
                {ex.exerciseName}
              </Text>
              <Text style={[adaptStyles.tableCell, { fontFamily: FONTS.mono, width: 64, textAlign: "center" }]}>
                {ex.nominalLoadKg != null ? `${ex.nominalLoadKg}kg` : "—"}
              </Text>
              <Text style={[adaptStyles.tableCell, { fontFamily: FONTS.monoBold, width: 64, textAlign: "center", color: cfg.color }]}>
                {ex.adaptedLoadKg != null ? `${ex.adaptedLoadKg}kg` : "—"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const adaptStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  textGroup: { flex: 1, gap: 3 },
  pct: { fontSize: 16, letterSpacing: 0.5 },
  explanation: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  chevronBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingTop: 2,
    flexShrink: 0,
  },
  detailText: { fontSize: 12 },
  tableContainer: { gap: 0 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 2,
  },
  tableHLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: "center",
  },
  tableExName: { fontSize: 13, color: COLORS.white },
  tableCell: { fontSize: 13, color: COLORS.textSecondary },
});

export default function SessionIntroScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const checkinQuery = useGetTodayCheckin();
  const startMutation = useStartSession();
  const completeMutation = useCompleteSession();
  const [startError, setStartError] = React.useState("");
  const [validationMode, setValidationMode] = React.useState(false);
  const [validatedSets, setValidatedSets] = React.useState<Record<string, boolean[]>>({});
  const [completing, setCompleting] = React.useState(false);
  const [presenceConfirmed, setPresenceConfirmed] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"guided" | "board">("guided");
  const [viewModeLoaded, setViewModeLoaded] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem("adapt_session_view_mode").then((v) => {
      if (v === "guided" || v === "board") setViewMode(v);
    }).catch(() => {}).finally(() => setViewModeLoaded(true));
  }, []);

  const changeViewMode = (mode: "guided" | "board") => {
    setViewMode(mode);
    AsyncStorage.setItem("adapt_session_view_mode", mode).catch(() => {});
  };

  useFocusEffect(
    React.useCallback(() => {
      sessionQuery.refetch();
      checkinQuery.refetch();
    }, [])
  );

  const checkin = checkinQuery.data;
  const canEditCheckin =
    checkin?.createdAt
      ? Date.now() - new Date(checkin.createdAt).getTime() < TWO_HOURS_MS
      : false;

  const handleEditCheckin = () => {
    router.push({
      pathname: "/checkin",
      params: {
        sleep: String(checkin?.sleep ?? 3),
        energy: String(checkin?.energy ?? 3),
        stress: String(checkin?.stress ?? 3),
        soreness: String(checkin?.soreness ?? 3),
        motivation: String(checkin?.motivation ?? 3),
        hasPain: checkin?.hasPain ? "1" : "0",
        painNotes: checkin?.painNotes ?? "",
        cyclePhase: checkin?.cyclePhase ?? undefined,
        edit: "1",
      },
    });
  };

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  const enterValidationMode = () => {
    const exercises = session?.exercises ?? [];
    const initial: Record<string, boolean[]> = {};
    for (const ex of exercises) {
      initial[ex.id] = Array(ex.sets ?? 1).fill(false);
    }
    setValidatedSets(initial);
    setValidationMode(true);
  };

  const toggleSet = (exId: string, setIdx: number) => {
    setValidatedSets((prev) => {
      const arr = [...(prev[exId] ?? [])];
      arr[setIdx] = !arr[setIdx];
      return { ...prev, [exId]: arr };
    });
  };

  const validateAllSets = (exId: string, count: number) => {
    setValidatedSets((prev) => ({
      ...prev,
      [exId]: Array(count).fill(true),
    }));
  };

  const allValidated = React.useMemo(() => {
    if (!validationMode || !session) return false;
    for (const ex of session.exercises ?? []) {
      const sets = validatedSets[ex.id] ?? [];
      if (sets.some((v) => !v)) return false;
      if (sets.length !== (ex.sets ?? 1)) return false;
    }
    return (session.exercises?.length ?? 0) > 0;
  }, [validationMode, validatedSets, session]);

  const handleValidationComplete = async () => {
    if (!session || !allValidated) return;
    setCompleting(true);
    setStartError("");
    try {
      const exercises = session.exercises ?? [];
      await completeMutation.mutateAsync({
        sessionId: session.sessionLogId,
        data: {
          rpe: 5,
          exercises: exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            setsCompleted: ex.sets,
            loadKgUsed: ex.adaptedLoadKg ?? ex.nominalLoadKg ?? undefined,
          })),
        },
      });
      router.replace("/session/complete");
    } catch (err: unknown) {
      setStartError(getGenericErrorMessage(err, "Impossible de valider la séance"));
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmPresence = async () => {
    if (!session) return;
    setCompleting(true);
    setStartError("");
    try {
      await completeMutation.mutateAsync({
        sessionId: session.sessionLogId,
        data: {
          rpe: 5,
          exercises: [],
        },
      });
      setPresenceConfirmed(true);
      setTimeout(() => {
        router.replace("/session/complete");
      }, 1200);
    } catch (err: unknown) {
      setStartError(getGenericErrorMessage(err, "Impossible de confirmer la présence"));
      setCompleting(false);
    }
  };

  if (sessionQuery.isPending) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Feather name="calendar" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: FONTS.title }]}>AUCUNE SÉANCE</Text>
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            Aucune séance n'est programmée pour aujourd'hui. Ton coach n'a pas encore attribué de programme.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.bodyMedium }]}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleStart = async () => {
    setStartError("");
    try {
      await startMutation.mutateAsync({ sessionId: session.sessionLogId });
      if (viewMode === "board") {
        router.push("/session/board");
      } else {
        router.push("/session/exercise");
      }
    } catch (err: unknown) {
      setStartError(getGenericErrorMessage(err, "Impossible de démarrer la séance"));
    }
  };

  const showAdaptBanner = modeKey === "adapt" || modeKey === "recovery";

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.white} />
          </TouchableOpacity>
          {(session.exercises?.length ?? 0) > 0 && !validationMode && (
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                onPress={() => changeViewMode("guided")}
                style={[
                  styles.modeToggleBtn,
                  viewMode === "guided" && { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}60` },
                ]}
              >
                <Feather name="play-circle" size={12} color={viewMode === "guided" ? cfg.color : COLORS.textMuted} />
                <Text style={[styles.modeToggleBtnText, { fontFamily: FONTS.mono, color: viewMode === "guided" ? cfg.color : COLORS.textMuted }]}>
                  GUIDÉ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => changeViewMode("board")}
                style={[
                  styles.modeToggleBtn,
                  viewMode === "board" && { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}60` },
                ]}
              >
                <Feather name="grid" size={12} color={viewMode === "board" ? cfg.color : COLORS.textMuted} />
                <Text style={[styles.modeToggleBtnText, { fontFamily: FONTS.mono, color: viewMode === "board" ? cfg.color : COLORS.textMuted }]}>
                  TABLEAU
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <ModeBadge mode={modeKey} size="sm" glow />
        </View>

        <View style={[styles.heroSection, { borderColor: `${cfg.color}40` }]}>
          <Text style={[styles.heroTitle, { fontFamily: FONTS.title, color: cfg.color }]}>
            {session.name}
          </Text>
          <View style={styles.heroMeta}>
            {session.estimatedDurationMin != null && (
              <View style={styles.metaChip}>
                <Feather name="clock" size={13} color={COLORS.textMuted} />
                <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
                  {session.estimatedDurationMin} MIN
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Feather name="list" size={13} color={COLORS.textMuted} />
              <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
                {session.exercises?.length ?? 0} EXERCICES
              </Text>
            </View>
            {(() => {
              const isPresentiel = session.sessionLocation === "presentiel";
              const color = isPresentiel ? COLORS.amber : COLORS.cyan;
              return (
                <View style={[styles.metaChip, {
                  borderColor: `${color}40`,
                  backgroundColor: `${color}12`,
                }]}>
                  <Feather name={isPresentiel ? "map-pin" : "video"} size={12} color={color} />
                  <Text style={[styles.metaText, { fontFamily: FONTS.mono, color }]}>
                    {isPresentiel ? "PRÉSENTIEL" : "EN LIGNE"}
                  </Text>
                </View>
              );
            })()}
            {session.scheduledTime ? (
              <View style={[styles.metaChip, { borderColor: "#ffffff20", backgroundColor: "#ffffff08" }]}>
                <Feather name="clock" size={12} color={COLORS.textMuted} />
                <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                  {session.scheduledTime}
                </Text>
              </View>
            ) : null}
          </View>
          {session.visioLink && session.sessionLocation !== "presentiel" ? (
            <View style={[styles.metaChip, { borderColor: `${COLORS.cyan}30`, backgroundColor: `${COLORS.cyan}08`, marginTop: 6 }]}>
              <Feather name="link" size={12} color={COLORS.cyan} />
              <Text
                style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.cyan, flex: 1 }]}
                numberOfLines={1}
              >
                {session.visioLink}
              </Text>
            </View>
          ) : null}
          <View style={[styles.scoreRow, { backgroundColor: `${cfg.color}10`, borderColor: `${cfg.color}40` }]}>
            <Text style={[styles.scoreLabel, { fontFamily: FONTS.mono }]}>ADAPT SCORE</Text>
            <Text style={[styles.scoreVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
              {session.adaptScore}
            </Text>
          </View>
          {canEditCheckin && (
            <TouchableOpacity onPress={handleEditCheckin} style={styles.editCheckinRow}>
              <Feather name="edit-2" size={12} color={COLORS.textMuted} />
              <Text style={[styles.editCheckinText, { fontFamily: FONTS.body }]}>
                Modifier mon check-in du jour
              </Text>
              <Feather name="chevron-right" size={12} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {showAdaptBanner && (
          <AdaptBanner
            mode={modeKey}
            adaptScore={session.adaptScore}
            exercises={session.exercises ?? []}
          />
        )}

        {(() => {
          const allEquipmentKeys = (session.exercises ?? [])
            .flatMap(ex => ((ex.equipment as string[] | null | undefined) ?? []))
            .filter(e => e !== "Aucun" && e !== "aucun" && e !== "poids-du-corps");
          const uniqueKeys = [...new Set(allEquipmentKeys)];
          const uniqueLabels = uniqueKeys.map(equipmentLabelFromKey);
          if (uniqueLabels.length === 0) return null;
          return (
            <View style={styles.equipmentCard}>
              <View style={styles.equipmentCardHeader}>
                <Feather name="package" size={14} color={COLORS.amber} />
                <Text style={[styles.equipmentCardLabel, { fontFamily: FONTS.mono }]}>
                  TU AURAS BESOIN DE
                </Text>
              </View>
              <View style={styles.equipmentTagsRow}>
                {uniqueLabels.map((label, i) => (
                  <View key={uniqueKeys[i]} style={styles.equipmentTag}>
                    <Text style={[styles.equipmentTagText, { fontFamily: FONTS.mono }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {session.coachNotes != null && (
          <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.coachIconWrap}>
                <Feather name="message-square" size={14} color={COLORS.cyan} />
              </View>
              <Text style={[styles.coachLabel, { fontFamily: FONTS.mono }]}>NOTES DU COACH</Text>
            </View>
            <Text style={[styles.coachText, { fontFamily: FONTS.body }]}>{session.coachNotes}</Text>
          </View>
        )}

        <View style={styles.exerciseList}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>PROGRAMME</Text>
            {validationMode && (
              <TouchableOpacity onPress={() => setValidationMode(false)} style={styles.exitValidationBtn}>
                <Feather name="x" size={13} color={COLORS.textMuted} />
                <Text style={[styles.exitValidationText, { fontFamily: FONTS.body }]}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
          {(() => {
            const exercises = session.exercises ?? [];
            const blocks = session.blocks ?? [];

            const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
            const knownBlockIds = new Set(blocks.map(b => b.id));
            const byBlock = new Map<string, typeof exercises>(sortedBlocks.map(b => [b.id, []]));
            const unassigned: typeof exercises = [];

            for (const ex of exercises) {
              if (ex.blockId && knownBlockIds.has(ex.blockId)) {
                byBlock.get(ex.blockId)!.push(ex);
              } else {
                unassigned.push(ex);
              }
            }

            type Segment =
              | { kind: "solo"; exercise: typeof exercises[0]; globalIndex: number }
              | { kind: "block"; block: typeof blocks[0]; exercises: { ex: typeof exercises[0]; globalIndex: number }[] };

            const segments: Segment[] = [];
            let globalIdx = 0;

            for (const block of sortedBlocks) {
              const blockExercises = byBlock.get(block.id) ?? [];
              if (blockExercises.length > 0) {
                const grouped = blockExercises.map(e => ({ ex: e, globalIndex: globalIdx++ }));
                segments.push({ kind: "block", block, exercises: grouped });
              }
            }
            for (const ex of unassigned) {
              segments.push({ kind: "solo", exercise: ex, globalIndex: globalIdx++ });
            }

            const renderValidationRow = (ex: typeof exercises[0]) => {
              const setsArr = validatedSets[ex.id] ?? Array(ex.sets ?? 1).fill(false);
              const allDone = setsArr.every(Boolean);
              return (
                <View key={`val-${ex.id}`} style={valStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[valStyles.exName, { fontFamily: FONTS.bodyMedium }]}>{ex.exerciseName}</Text>
                    <Text style={[valStyles.exDetail, { fontFamily: FONTS.mono }]}>
                      {ex.sets}×{ex.reps}
                      {ex.adaptedLoadKg != null ? ` · ${ex.adaptedLoadKg}kg` : ""}
                    </Text>
                    <View style={valStyles.setsRow}>
                      {setsArr.map((checked, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleSet(ex.id, idx)}
                          style={[
                            valStyles.setChip,
                            checked && valStyles.setChipChecked,
                            checked && { backgroundColor: `${cfg.color}20`, borderColor: cfg.color },
                          ]}
                        >
                          {checked
                            ? <Feather name="check" size={11} color={cfg.color} />
                            : <Text style={[valStyles.setChipLabel, { fontFamily: FONTS.mono }]}>S{idx + 1}</Text>
                          }
                        </TouchableOpacity>
                      ))}
                      {!allDone && (
                        <TouchableOpacity
                          onPress={() => validateAllSets(ex.id, ex.sets ?? 1)}
                          style={valStyles.validateAllBtn}
                        >
                          <Text style={[valStyles.validateAllText, { fontFamily: FONTS.body, color: cfg.color }]}>
                            Tout valider
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {allDone && (
                    <View style={[valStyles.doneBadge, { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}40` }]}>
                      <Feather name="check-circle" size={14} color={cfg.color} />
                    </View>
                  )}
                </View>
              );
            };

            const renderExRow = (ex: typeof exercises[0], globalIndex: number, inBlock = false) => {
              if (validationMode) {
                return (
                  <View key={ex.id} style={inBlock ? valStyles.inBlock : undefined}>
                    {renderValidationRow(ex)}
                  </View>
                );
              }
              return (
                <View key={ex.id} style={[styles.exRow, inBlock && styles.exRowInBlock]}>
                  <View style={[styles.exThumbFallback, inBlock && styles.exThumbInBlock]}>
                    <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                      {String(globalIndex + 1).padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>{ex.exerciseName}</Text>
                    <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                      {ex.sets}×{ex.reps}
                      {ex.adaptedLoadKg != null ? ` · ${ex.adaptedLoadKg}kg` : ""}
                      {ex.restSeconds != null ? ` · ${ex.restSeconds}s repos` : ""}
                    </Text>
                    {ex.coachCue != null && (
                      <Text style={[styles.exCue, { fontFamily: FONTS.body }]}>{ex.coachCue}</Text>
                    )}
                    {ex.description != null && ex.description.length > 0 && (
                      <Text style={[styles.exDesc, { fontFamily: FONTS.body }]}>
                        {ex.description}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
                </View>
              );
            };

            return segments.map((seg) => {
              if (seg.kind === "solo") {
                return renderExRow(seg.exercise, seg.globalIndex);
              }
              const blockType = seg.block.type?.toLowerCase() ?? "superset";
              const accentColor = BLOCK_TYPE_COLORS[blockType] ?? COLORS.cyan;
              const typeLabel = BLOCK_TYPE_LABELS[blockType] ?? blockType.toUpperCase();
              const blockLabel = seg.block.name
                ? `${typeLabel} · ${seg.block.name.toUpperCase()}`
                : typeLabel;
              return (
                <View key={seg.block.id} style={[styles.blockGroup, { borderColor: `${accentColor}40` }]}>
                  <View style={[styles.blockHeader, { backgroundColor: `${accentColor}12` }]}>
                    <View style={[styles.blockDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.blockLabel, { fontFamily: FONTS.mono, color: accentColor }]}>
                      {blockLabel}
                    </Text>
                    {seg.block.notes != null && (
                      <Text style={[styles.blockNotes, { fontFamily: FONTS.body }]}>{seg.block.notes}</Text>
                    )}
                  </View>
                  {seg.exercises.map(({ ex, globalIndex }) =>
                    renderExRow(ex, globalIndex, true)
                  )}
                </View>
              );
            });
          })()}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {startError ? (
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{startError}</Text>
        ) : null}
        {(session.exercises?.length ?? 0) === 0 && session.sessionLocation === "presentiel" ? (
          presenceConfirmed ? (
            <View style={styles.presenceConfirmedCard}>
              <Feather name="check-circle" size={22} color={COLORS.cyan} />
              <Text style={[styles.presenceConfirmedText, { fontFamily: FONTS.bodyBold }]}>
                Présence confirmée !
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleConfirmPresence}
              disabled={completing}
              style={[styles.confirmPresenceBtn, { opacity: completing ? 0.6 : 1 }]}
            >
              <Feather name="check-circle" size={20} color={COLORS.bg} />
              <Text style={[styles.confirmPresenceBtnText, { fontFamily: FONTS.bodyBold }]}>
                {completing ? "ENREGISTREMENT…" : "CONFIRMER MA PRÉSENCE"}
              </Text>
            </TouchableOpacity>
          )
        ) : (session.exercises?.length ?? 0) === 0 ? (
          <View style={styles.noExCard}>
            <Feather name="info" size={18} color={COLORS.textMuted} />
            <Text style={[styles.noExText, { fontFamily: FONTS.body }]}>
              Cette séance n'a aucun exercice. Contacte ton coach pour la compléter.
            </Text>
          </View>
        ) : validationMode ? (
          <TouchableOpacity
            onPress={handleValidationComplete}
            disabled={!allValidated || completing}
            style={[
              styles.validateCompleteBtn,
              {
                backgroundColor: allValidated ? cfg.color : COLORS.bgElevated,
                opacity: completing ? 0.6 : 1,
              },
            ]}
          >
            <Feather
              name="check-circle"
              size={18}
              color={allValidated ? COLORS.bg : COLORS.textMuted}
            />
            <Text
              style={[
                styles.validateCompleteBtnText,
                {
                  fontFamily: FONTS.bodyBold,
                  color: allValidated ? COLORS.bg : COLORS.textMuted,
                },
              ]}
            >
              {completing
                ? "ENREGISTREMENT…"
                : allValidated
                ? "SÉANCE TERMINÉE !"
                : "VALIDE TOUTES LES SÉRIES"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <GradientButton
              label={startMutation.isPending ? "DÉMARRAGE…" : "DÉMARRER LA SÉANCE"}
              onPress={handleStart}
              loading={startMutation.isPending || !viewModeLoaded}
              icon={<Feather name="play" size={18} color={COLORS.textInverse} />}
            />
            {viewMode === "guided" && (
              <TouchableOpacity onPress={enterValidationMode} style={styles.noChronoBtn}>
                <Feather name="check-square" size={16} color={COLORS.textSecondary} />
                <Text style={[styles.noChronoBtnText, { fontFamily: FONTS.bodyMedium }]}>
                  Valider sans chrono
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const valStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  inBlock: {
    paddingHorizontal: 14,
  },
  exName: { fontSize: 15, color: COLORS.white, marginBottom: 2 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 0.3, marginBottom: 8 },
  setsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  setChip: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  setChipChecked: {},
  setChipLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  validateAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  validateAllText: { fontSize: 12 },
  doneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    flexShrink: 0,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: { padding: 4 },
  heroSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: COLORS.bgCard,
    padding: 24,
    marginBottom: 16,
    gap: 16,
  },
  heroTitle: { fontSize: 40, letterSpacing: 2, lineHeight: 44 },
  heroMeta: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.5 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scoreLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5 },
  scoreVal: { fontSize: 24 },
  coachCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
    padding: 16,
    gap: 10,
  },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${COLORS.cyan}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  coachLabel: { fontSize: 10, color: COLORS.cyan, letterSpacing: 2 },
  coachText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  exerciseList: { paddingHorizontal: 20, marginBottom: 16, gap: 2 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  exitValidationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  exitValidationText: { fontSize: 12, color: COLORS.textMuted },
  exRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: "center",
  },
  exThumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  exNum: { fontSize: 12, color: COLORS.textMuted },
  exName: { fontSize: 15, color: COLORS.white, marginBottom: 3 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 0.3 },
  exCue: { fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", marginTop: 2 },
  exDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  noExCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noExText: { flex: 1, fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  noChronoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  noChronoBtnText: { fontSize: 14, color: COLORS.textSecondary },
  validateCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
  },
  validateCompleteBtnText: { fontSize: 16, letterSpacing: 0.5 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 28,
  },
  editCheckinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  editCheckinText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 36, color: COLORS.white, letterSpacing: 4 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
  homeBtn: {
    marginTop: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: { fontSize: 15, color: COLORS.white },
  equipmentCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.amber}30`,
    padding: 16,
    gap: 12,
  },
  equipmentCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  equipmentCardLabel: { fontSize: 10, color: COLORS.amber, letterSpacing: 2 },
  equipmentTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipmentTag: {
    backgroundColor: `${COLORS.amber}10`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${COLORS.amber}30`,
  },
  equipmentTagText: { fontSize: 12, color: COLORS.amber, letterSpacing: 0.3 },
  blockGroup: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexWrap: "wrap",
  },
  blockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  blockLabel: {
    fontSize: 10,
    letterSpacing: 2,
  },
  blockNotes: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    fontStyle: "italic",
  },
  exRowInBlock: {
    paddingHorizontal: 14,
    borderBottomColor: COLORS.border,
  },
  exThumbInBlock: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    marginHorizontal: 8,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  modeToggleBtnText: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  confirmPresenceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    backgroundColor: COLORS.cyan,
  },
  confirmPresenceBtnText: {
    fontSize: 16,
    letterSpacing: 0.5,
    color: COLORS.bg,
  },
  presenceConfirmedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    backgroundColor: `${COLORS.cyan}20`,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}50`,
  },
  presenceConfirmedText: {
    fontSize: 16,
    letterSpacing: 0.5,
    color: COLORS.cyan,
  },
});
