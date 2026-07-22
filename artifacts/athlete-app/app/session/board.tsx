import React, { useCallback, useEffect, useRef, useState } from "react";
import { getGenericErrorMessage } from "@/lib/errors";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import {
  useGetTodaySession,
  useCompleteSession,
} from "@workspace/api-client-react";
import type { AthletePRItem, SessionBlockItem, SessionExerciseItem } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { BLOCK_TYPE_COLORS, BLOCK_TYPE_LABELS } from "@/constants/blockTypes";
import { useFormatWeight } from "@/context/PreferencesContext";
import { getFreeSession, clearFreeSession } from "@/lib/freeSessionStore";
import { Stepper } from "@/components/ui/Stepper";
import { CircularTimer } from "@/components/ui/CircularTimer";
import { PRToast, type PRToastData } from "@/components/ui/PRToast";

type SetState = { load: string; reps: string; durationSeconds: string; done: boolean };
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
  const defaultDuration = ex.durationSeconds != null && ex.durationSeconds > 0 ? String(ex.durationSeconds) : "";
  return Array.from({ length: ex.sets }, () => ({
    load: defaultLoad,
    reps: defaultReps,
    durationSeconds: defaultDuration,
    done: false,
  }));
}

// Exact copy/format ported verbatim from exercise.tsx's `lastUsedLabel` —
// always shown in kg regardless of the athlete's unit preference, per the
// spec's "match the exact copy" requirement.
function lastUsedLabelFor(ex: { lastUsedLoadKg?: number | null; lastUsedDate?: string | null }): string | null {
  if (ex.lastUsedLoadKg == null) return null;
  if (!ex.lastUsedDate) return `Dernière fois : ${ex.lastUsedLoadKg} kg`;
  const d = new Date(ex.lastUsedDate);
  const day = d.getDate();
  const month = d.toLocaleDateString("fr-FR", { month: "short" });
  return `Dernière fois : ${ex.lastUsedLoadKg} kg · ${day} ${month}`;
}

// Mirrors api-server/src/lib/pr-math.ts's `isNewRecord` — a small, pure,
// stateless rule duplicated here on purpose for the optimistic set-time
// celebration only (Part 2). The server's own copy is untouched and stays
// the sole source of truth when the session is actually completed.
function isNewRecordClient(recordType: string, value: number, previous: number | null): boolean {
  if (previous === null) return true;
  if (recordType === "time") return value < previous;
  return value > previous;
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

  const athletePRs: Record<string, AthletePRItem> = isFromFreeStore
    ? (freeSessionSnapshot!.athletePRs ?? {})
    : (apiSession?.athletePRs ?? {});

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

  // Card expand/collapse — first exercise starts expanded, the rest
  // collapsed; auto-collapses a card when all of its sets are validated and
  // auto-expands the next incomplete one so the athlete can keep moving
  // down the list without extra taps (this auto-advance is an interpretive
  // addition on top of the mockup's explicit auto-collapse requirement).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (exercises.length === 0) return;
    setExpanded((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      exercises.forEach((ex, i) => {
        next[ex.id] = i === 0;
      });
      return next;
    });
  }, [exerciseIdsKey]);

  const toggleExpanded = useCallback((exId: string) => {
    setExpanded((prev) => ({ ...prev, [exId]: !prev[exId] }));
  }, []);

  // Rest timer — a real countdown ring (CircularTimer, ported from
  // exercise.tsx) per resting set, replacing the old plain text countdown.
  const [activeRest, setActiveRest] = useState<Record<string, boolean>>({});

  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const [demoExercise, setDemoExercise] = useState<SessionExerciseItem | null>(null);

  // Part 2 — PR celebration at set-log time. `athletePRs` is the athlete's
  // current records, already fetched once with today's session (no extra
  // round-trip needed). `sessionBestRef` seeds from that snapshot once and
  // is then updated in-session so a second, even-better set later in the
  // same session still compares against the athlete's latest logged best,
  // not the now-stale server value.
  const sessionBestRef = useRef<Record<string, number> | null>(null);
  if (sessionBestRef.current === null) {
    const seed: Record<string, number> = {};
    for (const [exId, pr] of Object.entries(athletePRs)) seed[exId] = pr.value;
    sessionBestRef.current = seed;
  }
  const [prToast, setPrToast] = useState<PRToastData | null>(null);

  const maybeCelebratePR = useCallback(
    (ex: SessionExerciseItem, set: SetState) => {
      const pr = athletePRs[ex.exerciseId];
      // Only celebrate genuine improvements on an existing record — mirrors
      // exercise.tsx's own PRPulse gate (`currentPR != null`), so a first-
      // ever log of a brand-new exercise doesn't pop a toast for every
      // single exercise in a fresh program.
      if (!pr) return;

      let value: number | null = null;
      if (pr.recordType === "load") {
        const v = parseFloat(set.load);
        value = !isNaN(v) && v > 0 ? v : null;
      } else if (pr.recordType === "time") {
        const v = parseFloat(set.durationSeconds);
        value = !isNaN(v) && v > 0 ? v : null;
      } else if (pr.recordType === "reps") {
        const v = parseInt(set.reps, 10);
        value = !isNaN(v) && v > 0 ? v : null;
      }
      // "distance" isn't a metric board.tsx's set rows collect, so it's
      // left to the authoritative batch check at session-complete.
      if (value == null) return;

      const best = sessionBestRef.current![ex.exerciseId] ?? pr.value;
      if (!isNewRecordClient(pr.recordType, value, best)) return;

      sessionBestRef.current![ex.exerciseId] = value;
      setPrToast({ exerciseName: ex.exerciseName, recordType: pr.recordType, value });
    },
    [athletePRs]
  );

  const updateSetField = useCallback(
    (exId: string, setIdx: number, field: "load" | "reps" | "durationSeconds", value: string) => {
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
      const arr = exState[ex.id] ?? [];
      const current = arr[setIdx];
      if (!current) return;
      const nowDone = !current.done;
      const newArr = [...arr];
      newArr[setIdx] = { ...current, done: nowDone };
      const newExState = { ...exState, [ex.id]: newArr };
      setExState(newExState);

      if (nowDone) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if ((ex.restSeconds ?? 0) > 0) {
          setActiveRest((t) => ({ ...t, [`${ex.id}:${setIdx}`]: true }));
        }
        maybeCelebratePR(ex, current);
      }

      const allExDoneNow = newArr.every((s) => s.done);
      if (allExDoneNow) {
        setExpanded((prevExpanded) => {
          const next: Record<string, boolean> = { ...prevExpanded, [ex.id]: false };
          const order = exercises.map((e) => e.id);
          const idx = order.indexOf(ex.id);
          for (let i = idx + 1; i < order.length; i++) {
            const nid = order[i]!;
            const sets = nid === ex.id ? newArr : (exState[nid] ?? []);
            if (!(sets.length > 0 && sets.every((s) => s.done))) {
              next[nid] = true;
              break;
            }
          }
          return next;
        });
      }
    },
    [exState, exercises, maybeCelebratePR]
  );

  const skipRest = useCallback((key: string) => {
    setActiveRest((t) => ({ ...t, [key]: false }));
  }, []);

  const deleteSet = useCallback((exId: string, setIdx: number) => {
    setExState((prev) => {
      const arr = prev[exId] ?? [];
      if (arr.length <= 1) return prev;
      const next = arr.filter((_, i) => i !== setIdx);
      return { ...prev, [exId]: next };
    });
    setActiveRest((prev) => {
      const next = { ...prev };
      delete next[`${exId}:${setIdx}`];
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const addSet = useCallback((ex: SessionExerciseItem) => {
    setExState((prev) => {
      const arr = [...(prev[ex.id] ?? [])];
      const last = arr[arr.length - 1];
      arr.push({
        load: last?.load ?? String(ex.adaptedLoadKg ?? ex.nominalLoadKg ?? ex.lastUsedLoadKg ?? ""),
        reps: last?.reps ?? (ex.reps ?? ""),
        durationSeconds: last?.durationSeconds ?? (ex.durationSeconds != null && ex.durationSeconds > 0 ? String(ex.durationSeconds) : ""),
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

  const handleComplete = async (force = false) => {
    if (completing || !sessionLogId) return;
    if (!allDone && !force) return;
    setCompleting(true);
    setError("");
    try {
      const exercisePayload = exercises.map((ex) => {
        const sets = exState[ex.id] ?? [];
        const doneSets = sets.filter((s) => s.done);
        const loads = doneSets.map((s) => parseFloat(s.load)).filter((n) => !isNaN(n) && n > 0);
        const avgLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : undefined;
        const repsArr = doneSets.map((s) => parseInt(s.reps, 10)).filter((n) => !isNaN(n) && n > 0);
        // "time" PRs are the athlete's BEST (lowest) time — unlike load, an
        // average would blur out their actual best effort, so this takes
        // the fastest completed set instead.
        const durations = doneSets.map((s) => parseFloat(s.durationSeconds)).filter((n) => !isNaN(n) && n > 0);
        const bestDuration = durations.length > 0 ? Math.min(...durations) : undefined;
        return {
          exerciseId: ex.exerciseId,
          setsCompleted: doneSets.length,
          loadKgUsed: avgLoad,
          repsPerSet: repsArr.length > 0 ? repsArr : undefined,
          durationSecondsUsed: bestDuration,
        };
      });

      // No `rpe` here: RPE is collected once, for the whole session, on the
      // shared complete.tsx screen right after this call — sending a fake
      // value here would just get overwritten there. The field is optional
      // server-side (completeSchema), so omitting it is safe.
      await completeMutation.mutateAsync({
        sessionId: sessionLogId,
        data: { exercises: exercisePayload },
      });

      if (isFromFreeStore && freeSessionSnapshot!.isFreeSession) {
        router.replace("/session/free-complete");
      } else {
        const totalBonus = exercises.reduce((sum, ex) => {
          const sets = exState[ex.id] ?? [];
          const doneSets = sets.filter((s) => s.done);
          return sum + Math.max(0, doneSets.length - (ex.sets ?? 1));
        }, 0);
        router.replace({
          pathname: "/session/complete",
          params: totalBonus > 0 ? { bonusSets: String(totalBonus) } : {},
        });
      }
    } catch (err: unknown) {
      setError(getGenericErrorMessage(err, "Impossible de terminer la séance. Réessaie."));
    } finally {
      setCompleting(false);
    }
  };

  const handleQuit = () => {
    Alert.alert(
      "Quitter la séance ?",
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
      <PRToast pr={prToast} formatWeight={formatWeight} onDismiss={() => setPrToast(null)} />

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
                  const doneCount = sets.filter((s) => s.done).length;
                  const prescribedLoad = ex.adaptedLoadKg ?? ex.nominalLoadKg ?? null;
                  const hasLoad = ((prescribedLoad ?? ex.lastUsedLoadKg) != null)
                    && ((prescribedLoad ?? ex.lastUsedLoadKg)! > 0);
                  const hasDuration = (ex.durationSeconds ?? 0) > 0;
                  const hasDemo = (ex.gifUrl != null && ex.gifUrl.length > 0) || (ex.demoUrl != null && ex.demoUrl.length > 0);
                  const lastUsedLabel = lastUsedLabelFor(ex);
                  const isExpanded = expanded[ex.id] ?? false;

                  return (
                    <View key={ex.id} style={[s.exCard, allExDone && { opacity: 0.85, borderColor: `${cfg.color}40` }]}>
                      <TouchableOpacity
                        style={s.exHeader}
                        onPress={() => toggleExpanded(ex.id)}
                        activeOpacity={0.75}
                      >
                        <View style={s.exHeaderLeft}>
                          <Text style={[s.exName, { fontFamily: FONTS.bodyMedium, color: allExDone ? cfg.color : COLORS.white }]}>
                            {allExDone ? "✓  " : ""}{ex.exerciseName}
                          </Text>
                          <Text style={[s.exTarget, { fontFamily: FONTS.mono }]}>
                            {ex.sets} × {ex.reps ?? "–"}
                            {prescribedLoad != null && prescribedLoad > 0
                              ? `  ·  ${formatWeight(prescribedLoad)} cible`
                              : ""}
                            {(ex.restSeconds ?? 0) > 0 ? `  ·  ${ex.restSeconds}s repos` : ""}
                          </Text>
                          {lastUsedLabel != null && (
                            <Text style={[s.exLastUsed, { fontFamily: FONTS.mono }]}>{lastUsedLabel}</Text>
                          )}
                        </View>
                        <View style={s.exHeaderRight}>
                          <View
                            style={[
                              s.doneBadge,
                              allExDone
                                ? { backgroundColor: `${cfg.color}20`, borderColor: cfg.color }
                                : doneCount > 0
                                ? { backgroundColor: `${cfg.color}10`, borderColor: `${cfg.color}40` }
                                : { borderColor: COLORS.border },
                            ]}
                          >
                            {allExDone ? (
                              <Feather name="check" size={12} color={cfg.color} />
                            ) : (
                              <Text style={[s.doneBadgeText, { fontFamily: FONTS.mono, color: doneCount > 0 ? cfg.color : COLORS.textMuted }]}>
                                {doneCount}/{sets.length}
                              </Text>
                            )}
                          </View>
                          <Feather
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={COLORS.textMuted}
                          />
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={s.setsContainer}>
                          {hasDemo && (
                            <TouchableOpacity
                              onPress={() => setDemoExercise(ex)}
                              style={[s.demoBtn, { borderColor: `${cfg.color}50` }]}
                            >
                              <Feather name="play-circle" size={13} color={cfg.color} />
                              <Text style={[s.demoBtnText, { fontFamily: FONTS.bodyMedium, color: cfg.color }]}>
                                Voir la démo
                              </Text>
                            </TouchableOpacity>
                          )}

                          <View style={s.setsHeaderRow}>
                            <Text style={[s.setsHeaderCell, s.colSerie, { fontFamily: FONTS.mono }]}>SÉRIE</Text>
                            {hasLoad && <Text style={[s.setsHeaderCell, s.colLoad, { fontFamily: FONTS.mono }]}>CHARGE</Text>}
                            {hasDuration && <Text style={[s.setsHeaderCell, s.colLoad, { fontFamily: FONTS.mono }]}>DURÉE</Text>}
                            <Text style={[s.setsHeaderCell, hasLoad ? s.colReps : s.colRepsWide, { fontFamily: FONTS.mono }]}>REPS</Text>
                            <View style={s.colCheck} />
                          </View>

                          {(sets as SetState[]).map((st, idx) => {
                            const timerKey = `${ex.id}:${idx}`;
                            const showTimer = !!activeRest[timerKey];
                            const canDelete = (sets as SetState[]).length > 1;
                            const renderRightActions = () => (
                              <TouchableOpacity
                                onPress={() => {
                                  Alert.alert(
                                    "Supprimer la série ?",
                                    `Série S${idx + 1}`,
                                    [
                                      { text: "Annuler", style: "cancel" },
                                      { text: "Supprimer", style: "destructive", onPress: () => deleteSet(ex.id, idx) },
                                    ],
                                  );
                                }}
                                style={s.swipeDeleteAction}
                                activeOpacity={0.85}
                              >
                                <Feather name="trash-2" size={18} color={COLORS.white} />
                              </TouchableOpacity>
                            );
                            const loadValue = parseFloat(st.load);
                            const rowContent = (
                              <View style={[s.setRow, st.done && { backgroundColor: `${cfg.color}08` }]}>
                                <Text style={[s.colSerie, s.setLabel, { fontFamily: FONTS.mono, color: st.done ? cfg.color : COLORS.textMuted }]}>
                                  S{idx + 1}
                                </Text>
                                {hasLoad && (
                                  <View style={s.colLoad}>
                                    {st.done ? (
                                      <Text style={[s.doneValueText, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                                        {st.load ? `${st.load} kg` : "—"}
                                      </Text>
                                    ) : (
                                      <Stepper
                                        value={!isNaN(loadValue) ? loadValue : 0}
                                        onChange={(v) => updateSetField(ex.id, idx, "load", String(v))}
                                        min={0}
                                        max={500}
                                        step={2.5}
                                        decimals={1}
                                        unit="kg"
                                        size="sm"
                                      />
                                    )}
                                  </View>
                                )}
                                {hasDuration && (
                                  <View style={s.colLoad}>
                                    <TextInput
                                      style={[s.input, { fontFamily: FONTS.mono, color: st.done ? cfg.color : COLORS.white, borderColor: st.done ? `${cfg.color}50` : COLORS.border }]}
                                      value={st.durationSeconds}
                                      onChangeText={(v) => updateSetField(ex.id, idx, "durationSeconds", v)}
                                      keyboardType="number-pad"
                                      placeholder="s"
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
                            );
                            return (
                              <View key={idx}>
                                {canDelete ? (
                                  <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
                                    {rowContent}
                                  </Swipeable>
                                ) : rowContent}
                                {showTimer && (ex.restSeconds ?? 0) > 0 && (
                                  <View style={[s.restRow, { backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}20` }]}>
                                    <CircularTimer
                                      durationSeconds={ex.restSeconds!}
                                      onComplete={() => skipRest(timerKey)}
                                      autoStart
                                      size={64}
                                    />
                                    <Text style={[s.restText, { fontFamily: FONTS.mono, color: cfg.color }]}>
                                      REPOS
                                    </Text>
                                    <TouchableOpacity onPress={() => skipRest(timerKey)} style={s.skipBtn}>
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
                      )}
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
          onPress={() => handleComplete(false)}
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
        {!allDone && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Terminer quand même ?",
                "Certaines séries ne sont pas encore validées. Tu peux terminer la séance maintenant, elles ne seront pas comptabilisées.",
                [
                  { text: "Continuer la séance", style: "cancel" },
                  { text: "Terminer quand même", style: "destructive", onPress: () => handleComplete(true) },
                ],
              );
            }}
            disabled={completing}
            style={s.forceCompleteBtn}
          >
            <Text style={[s.forceCompleteText, { fontFamily: FONTS.body }]}>
              Terminer quand même
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={demoExercise != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDemoExercise(null)}
      >
        <View style={[s.modalContainer, { paddingTop: insets.top }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { fontFamily: FONTS.mono }]} numberOfLines={1}>
              {demoExercise?.exerciseName ?? ""}
            </Text>
            <TouchableOpacity onPress={() => setDemoExercise(null)} style={s.modalCloseBtn}>
              <Feather name="x" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {demoExercise?.gifUrl != null && demoExercise.gifUrl.length > 0 ? (
            <Image
              source={{ uri: demoExercise.gifUrl }}
              style={s.webView}
              resizeMode="contain"
            />
          ) : demoExercise?.demoUrl != null && demoExercise.demoUrl.length > 0 ? (
            <WebView
              source={{ uri: demoExercise.demoUrl }}
              style={s.webView}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              startInLoadingState
              renderLoading={() => (
                <View style={s.webViewLoader}>
                  <ActivityIndicator size="large" color={cfg.color} />
                </View>
              )}
            />
          ) : (
            <View style={[s.webViewLoader, { flex: 1 }]}>
              <Feather name="video-off" size={36} color={COLORS.textMuted} />
              <Text style={{ color: COLORS.textMuted, marginTop: 8, fontFamily: FONTS.body }}>Pas de démonstration disponible</Text>
            </View>
          )}
        </View>
      </Modal>
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
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  exHeaderLeft: { flex: 1, gap: 3 },
  exHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  exName: { fontSize: 15, marginBottom: 2 },
  exTarget: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.3 },
  exLastUsed: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.3, marginTop: 2 },
  doneBadge: {
    minWidth: 30,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBadgeText: { fontSize: 10, letterSpacing: 0.3 },
  setsContainer: { paddingHorizontal: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginHorizontal: 12,
    marginTop: 10,
  },
  demoBtnText: { fontSize: 12 },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  setsHeaderCell: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1.5 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  setLabel: { fontSize: 11, textAlign: "center" },
  colSerie: { width: 24, textAlign: "center" },
  colLoad: { flex: 1, alignItems: "center" },
  colReps: { flex: 1 },
  colRepsWide: { flex: 2 },
  colCheck: { width: 36, alignItems: "center" },
  doneValueText: { fontSize: 14, textAlign: "center" },
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
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  forceCompleteBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  forceCompleteText: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: "underline" },
  swipeDeleteAction: {
    backgroundColor: COLORS.red,
    justifyContent: "center",
    alignItems: "center",
    width: 64,
    marginVertical: 4,
    borderRadius: 8,
  },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  quitBtn: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  webView: { flex: 1 },
  webViewLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
});
