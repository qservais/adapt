import React, { useCallback, useEffect, useRef, useState } from "react";
import { getGenericErrorMessage } from "@/lib/errors";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import * as Haptics from "expo-haptics";
import {
  useGetTodaySession,
  useCompleteSession,
} from "@workspace/api-client-react";
import type { SessionBlockItem, SessionExerciseItem } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { BLOCK_TYPE_COLORS, BLOCK_TYPE_LABELS } from "@/constants/blockTypes";
import { useFormatWeight } from "@/context/PreferencesContext";
import { getFreeSession, clearFreeSession } from "@/lib/freeSessionStore";

type SetState = { load: string; reps: string; done: boolean };
type ExState = SetState[];

function groupByBlock(
  exercises: SessionExerciseItem[],
  blocks: SessionBlockItem[]
): { block: SessionBlockItem | null; exercises: SessionExerciseItem[] }[] {
  const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  const knownBlockIds = new Set(blocks.map((b) => b.id));
  const blockMap = new Map<string, SessionExerciseItem[]>();
  const unassigned: SessionExerciseItem[] = [];
  for (const ex of exercises) {
    if (ex.blockId && knownBlockIds.has(ex.blockId)) {
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

function initialSetState(ex: SessionExerciseItem): ExState {
  const defaultLoad = String(
    ex.adaptedLoadKg ?? ex.nominalLoadKg ?? ex.lastUsedLoadKg ?? ""
  );
  const defaultReps = ex.reps ?? "";
  return Array.from({ length: ex.sets }, () => ({
    load: defaultLoad,
    reps: defaultReps,
    done: false,
  }));
}

export default function BoardScreen() {
  const insets = useSafeAreaInsets();
  const formatWeight = useFormatWeight();

  const [freeSessionSnapshot] = useState(() => getFreeSession());
  const isFromFreeStore = freeSessionSnapshot != null;

  const sessionQuery = useGetTodaySession();
  const completeMutation = useCompleteSession();

  const apiSession = isFromFreeStore ? null : sessionQuery.data;

  const exercises: SessionExerciseItem[] = isFromFreeStore
    ? (freeSessionSnapshot!.exercises as unknown as SessionExerciseItem[])
    : (apiSession?.exercises ?? []);

  const blocks: SessionBlockItem[] = isFromFreeStore
    ? ((freeSessionSnapshot!.blocks ?? []) as unknown as SessionBlockItem[])
    : (apiSession?.blocks ?? []);

  const modeKey = ((isFromFreeStore ? freeSessionSnapshot!.mode : apiSession?.mode) ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;
  const sessionLogId = isFromFreeStore ? freeSessionSnapshot!.sessionLogId : (apiSession?.sessionLogId ?? "");
  const sessionName = isFromFreeStore ? freeSessionSnapshot!.name : (apiSession?.name ?? "");

  const grouped = groupByBlock(exercises, blocks);

  const [exState, setExState] = useState<Record<string, ExState>>(() => {
    const init: Record<string, ExState> = {};
    for (const ex of exercises) {
      init[ex.id] = initialSetState(ex);
    }
    return init;
  });

  const exerciseIdsKey = exercises.map((e) => e.id).join(",");
  useEffect(() => {
    if (exercises.length === 0) return;
    setExState((prev) => {
      const next: Record<string, ExState> = {};
      for (const ex of exercises) {
        next[ex.id] = prev[ex.id] ?? initialSetState(ex);
      }
      return next;
    });
  }, [exerciseIdsKey]);

  const [restTimers, setRestTimers] = useState<Record<string, number>>({});
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const activeTimers = Object.entries(restTimers).filter(([, v]) => v > 0);

  useEffect(() => {
    if (activeTimers.length === 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }
    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setRestTimers((prev) => {
          const next = { ...prev };
          let anyActive = false;
          for (const key of Object.keys(next)) {
            if ((next[key] ?? 0) > 0) {
              next[key] = (next[key] ?? 0) - 1;
              anyActive = true;
            }
          }
          if (!anyActive && timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeTimers.length]);

  const updateSetField = useCallback(
    (exId: string, setIdx: number, field: "load" | "reps", value: string) => {
      setExState((prev) => {
        const arr = [...(prev[exId] ?? [])];
        if (arr[setIdx]) {
          arr[setIdx] = { ...arr[setIdx]!, [field]: value };
        }
        return { ...prev, [exId]: arr };
      });
    },
    []
  );

  const toggleSet = useCallback(
    (ex: SessionExerciseItem, setIdx: number) => {
      setExState((prev) => {
        const arr = [...(prev[ex.id] ?? [])];
        const current = arr[setIdx];
        if (!current) return prev;
        const nowDone = !current.done;
        arr[setIdx] = { ...current, done: nowDone };

        if (nowDone && (ex.restSeconds ?? 0) > 0) {
          const timerKey = `${ex.id}:${setIdx}`;
          setRestTimers((t) => ({ ...t, [timerKey]: ex.restSeconds! }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        return { ...prev, [ex.id]: arr };
      });
    },
    []
  );

  const skipTimer = useCallback((key: string) => {
    setRestTimers((t) => ({ ...t, [key]: 0 }));
  }, []);

  const addSet = useCallback((ex: SessionExerciseItem) => {
    setExState((prev) => {
      const arr = [...(prev[ex.id] ?? [])];
      const last = arr[arr.length - 1];
      arr.push({
        load: last?.load ?? String(ex.adaptedLoadKg ?? ex.nominalLoadKg ?? ex.lastUsedLoadKg ?? ""),
        reps: last?.reps ?? (ex.reps ?? ""),
        done: false,
      });
      return { ...prev, [ex.id]: arr };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const allDone = exercises.every((ex) => {
    const sets = exState[ex.id] ?? [];
    return sets.length > 0 && sets.every((s) => s.done);
  });

  const handleComplete = async () => {
    if (completing || !sessionLogId) return;
    setCompleting(true);
    setError("");
    try {
      const exercisePayload = exercises.map((ex) => {
        const sets = exState[ex.id] ?? [];
        const doneSets = sets.filter((s) => s.done);
        const loads = doneSets.map((s) => parseFloat(s.load)).filter((n) => !isNaN(n) && n > 0);
        const avgLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : undefined;
        const repsArr = doneSets.map((s) => parseInt(s.reps, 10)).filter((n) => !isNaN(n) && n > 0);
        return {
          exerciseId: ex.exerciseId,
          setsCompleted: doneSets.length,
          loadKgUsed: avgLoad,
          repsPerSet: repsArr.length > 0 ? repsArr : undefined,
        };
      });

      await completeMutation.mutateAsync({
        sessionId: sessionLogId,
        data: { rpe: 5, exercises: exercisePayload },
      });

      if (isFromFreeStore) {
        router.replace("/session/free-complete");
      } else {
        router.replace("/session/complete");
      }
    } catch (err: unknown) {
      setError(getGenericErrorMessage(err, "Impossible de terminer la séance. Réessaie."));
    } finally {
      setCompleting(false);
    }
  };

  const handleQuit = () => {
    Alert.alert(
      "Quitter le mode Tableau ?",
      "Ta progression non enregistrée sera perdue.",
      [
        { text: "Continuer", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () => {
            if (isFromFreeStore) clearFreeSession();
            router.back();
          },
        },
      ]
    );
  };

  if (!isFromFreeStore && (sessionQuery.isPending || (!apiSession && sessionQuery.isFetching))) {
    return (
      <View style={[s.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  if (!isFromFreeStore && !apiSession) {
    return (
      <View style={[s.flex, { backgroundColor: COLORS.bg, paddingTop: insets.top + 20, alignItems: "center", justifyContent: "center", gap: 16 }]}>
        <Feather name="alert-circle" size={40} color={COLORS.textMuted} />
        <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.body }}>Aucune séance disponible.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.quitBtn}>
          <Text style={{ color: COLORS.white, fontFamily: FONTS.bodyMedium }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completedCount = exercises.reduce((acc, ex) => {
    const sets = exState[ex.id] ?? [];
    return acc + sets.filter((s) => s.done).length;
  }, 0);
  const totalSets = exercises.reduce((acc, ex) => acc + (exState[ex.id]?.length ?? ex.sets), 0);

  return (
    <View style={[s.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleQuit} style={s.backBtn}>
          <Feather name="x" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { fontFamily: FONTS.title, color: cfg.color }]} numberOfLines={1}>
            {sessionName}
          </Text>
          <Text style={[s.headerSub, { fontFamily: FONTS.mono }]}>
            {completedCount}/{totalSets} séries
          </Text>
        </View>
        <View style={[s.modePill, { borderColor: `${cfg.color}50`, backgroundColor: `${cfg.color}12` }]}>
          <Feather name="grid" size={11} color={cfg.color} />
          <Text style={[s.modePillText, { fontFamily: FONTS.mono, color: cfg.color }]}>TABLEAU</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 90}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {grouped.map(({ block, exercises: groupExs }, gi) => {
            const blockType = block?.type?.toLowerCase() ?? "general";
            const accentColor = BLOCK_TYPE_COLORS[blockType] ?? COLORS.cyan;
            const typeLabel = BLOCK_TYPE_LABELS[blockType] ?? blockType.toUpperCase();
            const blockLabel = block
              ? block.name ? `${typeLabel} · ${block.name.toUpperCase()}` : typeLabel
              : "PROGRAMME";
            return (
              <View key={block?.id ?? "unassigned"} style={gi > 0 ? { marginTop: 12 } : undefined}>
                <View style={[s.blockBanner, { backgroundColor: `${block ? accentColor : COLORS.textMuted}10`, borderBottomColor: `${block ? accentColor : COLORS.textMuted}30` }]}>
                  <View style={[s.blockDot, { backgroundColor: block ? accentColor : COLORS.textMuted }]} />
                  <Text style={[s.blockLabel, { fontFamily: FONTS.mono, color: block ? accentColor : COLORS.textMuted }]}>
                    {blockLabel}
                  </Text>
                </View>
                {groupExs.map((ex) => {
                  const sets = exState[ex.id] ?? initialSetState(ex);
                  const allExDone = sets.every((s) => s.done);
                  const hasLoad = (ex.adaptedLoadKg ?? ex.nominalLoadKg ?? ex.lastUsedLoadKg) != null
                    && (ex.adaptedLoadKg ?? ex.nominalLoadKg ?? ex.lastUsedLoadKg)! > 0;
                  return (
                    <View key={ex.id} style={[s.exCard, allExDone && { opacity: 0.7 }]}>
                      <View style={s.exHeader}>
                        <View style={s.exHeaderLeft}>
                          <Text style={[s.exName, { fontFamily: FONTS.bodyMedium, color: allExDone ? cfg.color : COLORS.white }]}>
                            {allExDone && <Feather name="check-circle" size={13} color={cfg.color} />}
                            {allExDone ? "  " : ""}{ex.exerciseName}
                          </Text>
                          <Text style={[s.exTarget, { fontFamily: FONTS.mono }]}>
                            {ex.sets} × {ex.reps ?? "–"}
                            {hasLoad
                              ? `  ·  ${formatWeight(ex.adaptedLoadKg ?? ex.nominalLoadKg!)} cible`
                              : ""}
                            {(ex.restSeconds ?? 0) > 0 ? `  ·  ${ex.restSeconds}s repos` : ""}
                          </Text>
                        </View>
                      </View>

                      <View style={s.setsContainer}>
                        <View style={s.setsHeaderRow}>
                          <Text style={[s.setsHeaderCell, s.colSerie, { fontFamily: FONTS.mono }]}>SÉRIE</Text>
                          <Text style={[s.setsHeaderCell, s.colPrev, { fontFamily: FONTS.mono }]}>PRÉC.</Text>
                          {hasLoad && <Text style={[s.setsHeaderCell, s.colLoad, { fontFamily: FONTS.mono }]}>CHARGE</Text>}
                          <Text style={[s.setsHeaderCell, hasLoad ? s.colReps : s.colRepsWide, { fontFamily: FONTS.mono }]}>REPS</Text>
                          <View style={s.colCheck} />
                        </View>

                        {(sets as SetState[]).map((st, idx) => {
                          const timerKey = `${ex.id}:${idx}`;
                          const remaining = restTimers[timerKey] ?? 0;
                          const showTimer = st.done && remaining > 0;
                          const mins = Math.floor(remaining / 60);
                          const secs = remaining % 60;
                          return (
                            <View key={idx}>
                              <View style={[s.setRow, st.done && { backgroundColor: `${cfg.color}08` }]}>
                                <Text style={[s.colSerie, s.setLabel, { fontFamily: FONTS.mono, color: st.done ? cfg.color : COLORS.textMuted }]}>
                                  S{idx + 1}
                                </Text>
                                <View style={s.colPrev}>
                                  {(() => {
                                    const prevLoad = ex.lastUsedLoadKg;
                                    const prevRepsArr = ex.lastUsedRepsPerSet ?? [];
                                    const prevReps = prevRepsArr[idx] ?? prevRepsArr[prevRepsArr.length - 1];
                                    if (prevLoad == null) {
                                      return <Text style={[s.prevCell, { fontFamily: FONTS.mono }]}>—</Text>;
                                    }
                                    const loadStr = prevLoad % 1 === 0 ? `${prevLoad}` : prevLoad.toFixed(1);
                                    return (
                                      <Text style={[s.prevCell, { fontFamily: FONTS.mono }]} numberOfLines={1}>
                                        {loadStr}kg{prevReps != null ? ` × ${prevReps}` : ""}
                                      </Text>
                                    );
                                  })()}
                                </View>
                                {hasLoad && (
                                  <View style={s.colLoad}>
                                    <TextInput
                                      style={[s.input, { fontFamily: FONTS.mono, color: st.done ? cfg.color : COLORS.white, borderColor: st.done ? `${cfg.color}50` : COLORS.border }]}
                                      value={st.load}
                                      onChangeText={(v) => updateSetField(ex.id, idx, "load", v)}
                                      keyboardType="decimal-pad"
                                      placeholder="—"
                                      placeholderTextColor={COLORS.textMuted}
                                      editable={!st.done}
                                      selectTextOnFocus
                                    />
                                  </View>
                                )}
                                <View style={hasLoad ? s.colReps : s.colRepsWide}>
                                  <TextInput
                                    style={[s.input, { fontFamily: FONTS.mono, color: st.done ? cfg.color : COLORS.white, borderColor: st.done ? `${cfg.color}50` : COLORS.border }]}
                                    value={st.reps}
                                    onChangeText={(v) => updateSetField(ex.id, idx, "reps", v)}
                                    keyboardType="number-pad"
                                    placeholder="—"
                                    placeholderTextColor={COLORS.textMuted}
                                    editable={!st.done}
                                    selectTextOnFocus
                                  />
                                </View>
                                <TouchableOpacity
                                  style={[s.colCheck, s.checkBtn, st.done && { backgroundColor: `${cfg.color}20`, borderColor: cfg.color }]}
                                  onPress={() => toggleSet(ex, idx)}
                                  activeOpacity={0.7}
                                >
                                  <Feather
                                    name={st.done ? "check" : "circle"}
                                    size={16}
                                    color={st.done ? cfg.color : COLORS.border}
                                  />
                                </TouchableOpacity>
                              </View>

                              {showTimer && (
                                <View style={[s.restRow, { backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}20` }]}>
                                  <Feather name="clock" size={12} color={cfg.color} />
                                  <Text style={[s.restText, { fontFamily: FONTS.mono, color: cfg.color }]}>
                                    REPOS {mins > 0 ? `${mins}:` : ""}{String(secs).padStart(2, "0")}
                                  </Text>
                                  <TouchableOpacity onPress={() => skipTimer(timerKey)} style={s.skipBtn}>
                                    <Text style={[s.skipText, { fontFamily: FONTS.body, color: cfg.color }]}>Passer</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })}
                        <TouchableOpacity
                          style={s.addSetBtn}
                          onPress={() => addSet(ex)}
                          activeOpacity={0.7}
                        >
                          <Feather name="plus" size={12} color={COLORS.textMuted} />
                          <Text style={[s.addSetText, { fontFamily: FONTS.mono }]}>
                            {"AJOUTER UNE SÉRIE"}
                            {(ex.restSeconds ?? 0) > 0 ? `  ·  ${ex.restSeconds}s` : ""}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        {error ? (
          <Text style={[s.errorText, { fontFamily: FONTS.body }]}>{error}</Text>
        ) : null}
        <TouchableOpacity
          onPress={handleComplete}
          disabled={!allDone || completing}
          activeOpacity={0.85}
          style={[
            s.completeBtn,
            {
              backgroundColor: allDone ? cfg.color : COLORS.bgElevated,
              opacity: completing ? 0.7 : 1,
            },
          ]}
        >
          <Feather
            name={allDone ? "check-circle" : "circle"}
            size={18}
            color={allDone ? COLORS.bg : COLORS.textMuted}
          />
          <Text style={[s.completeBtnText, { fontFamily: FONTS.bodyBold, color: allDone ? COLORS.bg : COLORS.textMuted }]}>
            {completing
              ? "ENREGISTREMENT…"
              : allDone
              ? "TERMINER LA SÉANCE"
              : `${completedCount}/${totalSets} SÉRIES VALIDÉES`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 17, letterSpacing: 1 },
  headerSub: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modePillText: { fontSize: 9, letterSpacing: 1 },
  blockBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 7,
  },
  blockDot: { width: 6, height: 6, borderRadius: 3 },
  blockLabel: { fontSize: 9, letterSpacing: 2 },
  exCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  exHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exHeaderLeft: { flex: 1, gap: 3 },
  exName: { fontSize: 15, marginBottom: 2 },
  exTarget: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.3 },
  setsContainer: { paddingHorizontal: 0 },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  setsHeaderCell: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1.5 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  setLabel: { fontSize: 11, textAlign: "center" },
  colSerie: { width: 28, textAlign: "center" },
  colPrev: { width: 68, justifyContent: "center" },
  prevCell: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
  colLoad: { flex: 1 },
  colReps: { flex: 1 },
  colRepsWide: { flex: 2 },
  colCheck: { width: 36, alignItems: "center" },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addSetText: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.2 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 13,
    textAlign: "center",
    backgroundColor: COLORS.bg,
    minWidth: 44,
  },
  checkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  restRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  restText: { flex: 1, fontSize: 11, letterSpacing: 1 },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  skipText: { fontSize: 12 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
  },
  completeBtnText: { fontSize: 15, letterSpacing: 0.5 },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  quitBtn: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
