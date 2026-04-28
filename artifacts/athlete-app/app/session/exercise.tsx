import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGetTodaySession, equipmentLabelFromKey } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { CircularTimer, type CircularTimerRef } from "@/components/ui/CircularTimer";
import { Stepper } from "@/components/ui/Stepper";
import { ProgressBar } from "@/components/ui/ProgressBar";

const ENCOURAGEMENT = [
  "Super série ! Reprends ton souffle.",
  "C'est comme ça qu'on progresse !",
  "Tu gères. Profite du repos.",
  "Excellent effort. La prochaine sera encore meilleure.",
  "Chaque répétition compte. Bravo !",
  "Tu es plus fort(e) qu'hier.",
  "Concentre-toi pour la prochaine série !",
  "Le repos fait partie de l'entraînement.",
  "Reste focalisé(e), tu y es presque !",
];

function PRPulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        style,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          backgroundColor: `${color}20`,
          borderWidth: 1,
          borderColor: color,
        },
      ]}
    >
      <Feather name="trending-up" size={12} color={color} />
      <Text style={{ fontFamily: FONTS.monoBold, fontSize: 11, color, letterSpacing: 1 }}>
        NOUVEAU RECORD !
      </Text>
    </Animated.View>
  );
}

interface ExerciseRibbonProps {
  exercises: { exerciseName: string }[];
  currentIndex: number;
  completedCount: number;
  modeColor: string;
}

function ExerciseRibbon({ exercises, currentIndex, completedCount, modeColor }: ExerciseRibbonProps) {
  const listRef = useRef<FlatList<{ exerciseName: string }>>(null);

  useEffect(() => {
    if (listRef.current && exercises.length > 0) {
      listRef.current.scrollToIndex({ index: currentIndex, animated: true, viewPosition: 0.5 });
    }
  }, [currentIndex, exercises.length]);

  return (
    <FlatList
      ref={listRef}
      data={exercises}
      keyExtractor={(_, i) => String(i)}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.ribbonContent}
      onScrollToIndexFailed={() => {}}
      renderItem={({ item, index }) => {
        const isDone = index < completedCount;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        const pillBg = isDone
          ? `${modeColor}20`
          : isCurrent
          ? `${modeColor}30`
          : COLORS.bgElevated;

        const pillBorder = isDone
          ? `${modeColor}60`
          : isCurrent
          ? modeColor
          : COLORS.border;

        const numColor = isDone
          ? modeColor
          : isCurrent
          ? modeColor
          : COLORS.textMuted;

        return (
          <View
            style={[
              styles.ribbonPill,
              { backgroundColor: pillBg, borderColor: pillBorder },
              isCurrent && styles.ribbonPillCurrent,
            ]}
          >
            {isDone ? (
              <Feather name="check" size={11} color={modeColor} />
            ) : (
              <Text
                style={[
                  styles.ribbonNum,
                  { fontFamily: FONTS.mono, color: numColor },
                  isUpcoming && { opacity: 0.5 },
                ]}
              >
                {String(index + 1).padStart(2, "0")}
              </Text>
            )}
            <Text
              style={[
                styles.ribbonName,
                { fontFamily: FONTS.body },
                isDone && { color: modeColor },
                isCurrent && { color: COLORS.white },
                isUpcoming && { color: COLORS.textMuted },
              ]}
              numberOfLines={1}
            >
              {item.exerciseName.length > 10
                ? item.exerciseName.substring(0, 9) + "…"
                : item.exerciseName}
            </Text>
          </View>
        );
      }}
    />
  );
}

interface HistoryEntry {
  exerciseIndex: number;
  currentSet: number;
}

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const timerRef = useRef<CircularTimerRef>(null);
  const workTimerRef = useRef<CircularTimerRef>(null);
  const session = sessionQuery.data;
  const exercises = session?.exercises ?? [];
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;
  const athletePRs = (session as any)?.athletePRs as Record<string, number> | undefined;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [showRest, setShowRest] = useState(false);
  const [loadAdjustments, setLoadAdjustments] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [workTimerStarted, setWorkTimerStarted] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    setShowDescription(true);
    setShowDemoModal(false);
  }, [exerciseIndex]);

  const encouragementMsg = useMemo(
    () => ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showRest]
  );

  const exercise = exercises[exerciseIndex];
  const totalExercises = exercises.length;
  const isLast = exerciseIndex === totalExercises - 1;
  const nextExercise = !isLast ? exercises[exerciseIndex + 1] : null;

  const hasDurationTimer = (exercise?.durationSeconds ?? 0) > 0;
  const isAtStart = history.length === 0 && currentSet === 1;

  const adjustLoad = useCallback((exId: string, next: number) => {
    setLoadAdjustments((prev) => ({ ...prev, [exId]: next }));
  }, []);

  const pushHistory = () => {
    setHistory((prev) => [...prev, { exerciseIndex, currentSet }]);
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setExerciseIndex(prev.exerciseIndex);
    setCurrentSet(prev.currentSet);
    setShowRest(false);
    setTimerCompleted(false);
    setWorkTimerStarted(false);
    timerRef.current?.reset();
    workTimerRef.current?.reset();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const resetTimerState = () => {
    setTimerCompleted(false);
    setWorkTimerStarted(false);
    workTimerRef.current?.reset();
  };

  const handleSetDone = () => {
    if (hasDurationTimer && !timerCompleted) {
      Alert.alert(
        "Chrono obligatoire",
        "Lance et termine le chrono avant de valider la série.",
        [{ text: "OK" }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pushHistory();

    if (currentSet < (exercise?.sets ?? 1)) {
      resetTimerState();
      if ((exercise?.restSeconds ?? 0) > 0) {
        setShowRest(true);
        setTimeout(() => timerRef.current?.start(), 50);
      } else {
        setCurrentSet((s) => s + 1);
      }
    } else {
      handleExerciseDone();
    }
  };

  const handleExerciseDone = () => {
    setShowRest(false);
    timerRef.current?.reset();
    workTimerRef.current?.reset();
    resetTimerState();
    if (isLast) {
      router.replace("/session/complete");
    } else {
      setExerciseIndex((i) => i + 1);
      setCurrentSet(1);
    }
  };

  const handleSkipRest = () => {
    setShowRest(false);
    timerRef.current?.reset();
    setCurrentSet((s) => s + 1);
    resetTimerState();
  };

  const handleRestTimerComplete = () => {
    setShowRest(false);
    setCurrentSet((s) => s + 1);
    resetTimerState();
  };

  const handleWorkTimerStart = () => {
    setWorkTimerStarted(true);
    workTimerRef.current?.start();
  };

  const handleWorkTimerComplete = () => {
    setTimerCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (sessionQuery.isPending || (sessionQuery.isFetching && !session)) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 16 }]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.body }}>
          Chargement de la séance...
        </Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 }]}>
        <Feather name="alert-circle" size={40} color={COLORS.textMuted} />
        <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.body, textAlign: "center" }}>
          Aucun exercice disponible pour cette séance.
        </Text>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backHomeBtn}>
          <Text style={{ color: COLORS.white, fontFamily: FONTS.bodyMedium }}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lastUsedLoadKg = exercise.lastUsedLoadKg ?? null;
  const lastUsedDate = exercise.lastUsedDate ?? null;

  const currentLoad = loadAdjustments[exercise.id] ?? exercise.adaptedLoadKg ?? exercise.nominalLoadKg ?? lastUsedLoadKg ?? 0;
  const currentPR = athletePRs?.[exercise.exerciseId];
  const isAbovePR = currentPR != null && currentLoad > currentPR;

  const setDoneLabel = () => {
    if (currentSet < (exercise.sets ?? 1)) return `Série ${currentSet} terminée`;
    if (isLast) return "Terminer la séance";
    return "Exercice suivant";
  };

  const lastUsedLabel = React.useMemo(() => {
    if (lastUsedLoadKg == null) return null;
    if (!lastUsedDate) return `Dernière fois : ${lastUsedLoadKg} kg`;
    const d = new Date(lastUsedDate);
    const day = d.getDate();
    const month = d.toLocaleDateString("fr-FR", { month: "short" });
    return `Dernière fois : ${lastUsedLoadKg} kg · ${day} ${month}`;
  }, [lastUsedLoadKg, lastUsedDate]);

  const doneBtnDisabled = hasDurationTimer && !timerCompleted;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={handleGoBack}
          disabled={isAtStart}
          style={[styles.navBtn, isAtStart && styles.navBtnDisabled]}
        >
          <View style={[styles.navBtnBg, isAtStart && { opacity: 0.35 }]}>
            <Feather name="arrow-left" size={18} color={COLORS.white} />
          </View>
        </Pressable>

        <View style={{ flex: 1 }}>
          <ProgressBar
            progress={exerciseIndex}
            total={totalExercises}
            color={cfg.color}
            height={4}
          />
        </View>

        <View style={[styles.progressChip, { borderColor: `${cfg.color}50`, backgroundColor: `${cfg.color}15` }]}>
          <Text style={[styles.progressText, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
            {exerciseIndex + 1}/{totalExercises}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Alert.alert(
              "Quitter la séance ?",
              "Ta progression sera perdue.",
              [
                { text: "Continuer", style: "cancel" },
                { text: "Quitter", style: "destructive", onPress: () => router.back() },
              ]
            );
          }}
          style={styles.navBtn}
        >
          <View style={styles.navBtnBg}>
            <Feather name="x" size={18} color={COLORS.white} />
          </View>
        </Pressable>
      </View>

      <View style={styles.ribbonWrapper}>
        <ExerciseRibbon
          exercises={exercises}
          currentIndex={exerciseIndex}
          completedCount={exerciseIndex}
          modeColor={cfg.color}
        />
      </View>

      {(() => {
        const blocks = session?.blocks ?? [];
        const currentBlockId = exercise.blockId;
        if (!currentBlockId) return null;
        const block = blocks.find(b => b.id === currentBlockId);
        if (!block) return null;

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
        const blockType = block.type?.toLowerCase() ?? "superset";
        const accentColor = BLOCK_TYPE_COLORS[blockType] ?? COLORS.cyan;
        const typeLabel = BLOCK_TYPE_LABELS[blockType] ?? blockType.toUpperCase();
        const blockLabel = block.name
          ? `${typeLabel} · ${block.name.toUpperCase()}`
          : typeLabel;
        return (
          <View style={[styles.blockBanner, { backgroundColor: `${accentColor}10`, borderBottomColor: `${accentColor}30` }]}>
            <View style={[styles.blockBannerDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.blockBannerText, { fontFamily: FONTS.mono, color: accentColor }]}>
              {blockLabel}
            </Text>
          </View>
        );
      })()}

      <View style={styles.identityBlock}>
        <Text style={[styles.setLabel, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
          SÉRIE {currentSet}/{exercise.sets}
        </Text>
        <Text style={[styles.exerciseName, { fontFamily: FONTS.title, color: cfg.color }]}>
          {exercise.exerciseName}
        </Text>
        <Text style={[styles.repsText, { fontFamily: FONTS.mono }]}>
          {hasDurationTimer
            ? `${exercise.durationSeconds}s`
            : `${exercise.reps} REPS`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {((exercise.equipment as string[] | null | undefined) ?? []).filter(e => e !== "Aucun" && e !== "aucun").length > 0 && (
          <View style={styles.equipmentRow}>
            <Feather name="package" size={12} color={COLORS.textMuted} />
            <View style={styles.equipmentTags}>
              {((exercise.equipment as string[]).filter(e => e !== "Aucun" && e !== "aucun")).map(eq => (
                <View key={eq} style={styles.equipmentTag}>
                  <Text style={[styles.equipmentTagText, { fontFamily: FONTS.mono }]}>{equipmentLabelFromKey(eq)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {exercise.description != null && exercise.description.length > 0 && (
          <View style={styles.descriptionBox}>
            <View style={styles.descriptionHeader}>
              <Feather name="info" size={13} color={cfg.color} />
              <Text style={[styles.descriptionLabel, { fontFamily: FONTS.mono, color: cfg.color }]}>
                INSTRUCTIONS
              </Text>
              {((exercise.gifUrl != null && exercise.gifUrl.length > 0) || (exercise.demoUrl != null && exercise.demoUrl.length > 0)) && (
                <TouchableOpacity
                  onPress={() => setShowDemoModal(true)}
                  style={[styles.demoBtn, { borderColor: `${cfg.color}50` }]}
                >
                  <Feather name="play-circle" size={13} color={cfg.color} />
                  <Text style={[styles.demoBtnText, { fontFamily: FONTS.bodyMedium, color: cfg.color }]}>
                    Voir la démo
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowDescription(v => !v)}
                style={styles.descriptionToggle}
              >
                <Text style={[styles.descriptionToggleText, { fontFamily: FONTS.body }]}>
                  {showDescription ? "Masquer" : "Voir"}
                </Text>
                <Feather
                  name={showDescription ? "chevron-up" : "chevron-down"}
                  size={13}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {showDescription && (
              <Text style={[styles.descriptionText, { fontFamily: FONTS.body }]}>
                {exercise.description}
              </Text>
            )}
          </View>
        )}

        {currentLoad > 0 && (
          <View style={styles.loadSection}>
            <Stepper
              value={currentLoad}
              onChange={(v) => adjustLoad(exercise.id, v)}
              min={0}
              max={500}
              step={2.5}
              unit="kg"
              label="CHARGE"
              decimals={1}
            />
            {lastUsedLabel != null && (
              <View style={styles.lastUsedRow}>
                <Feather name="clock" size={11} color={COLORS.textMuted} />
                <Text style={[styles.lastUsedText, { fontFamily: FONTS.mono }]}>
                  {lastUsedLabel}
                </Text>
              </View>
            )}
            {isAbovePR && <PRPulse color={COLORS.green} />}
            {currentPR != null && !isAbovePR && (
              <View style={styles.prInfo}>
                <Feather name="award" size={12} color={COLORS.textMuted} />
                <Text style={[styles.prText, { fontFamily: FONTS.mono }]}>
                  Record actuel : {currentPR} kg
                </Text>
              </View>
            )}
          </View>
        )}

        {hasDurationTimer && !showRest && (
          <View style={styles.workTimerContainer}>
            <CircularTimer
              ref={workTimerRef}
              durationSeconds={exercise.durationSeconds!}
              onComplete={handleWorkTimerComplete}
              autoStart={false}
              label="TRAVAIL"
            />
            {!workTimerStarted && !timerCompleted && (
              <TouchableOpacity
                onPress={handleWorkTimerStart}
                style={[styles.startTimerBtn, { backgroundColor: cfg.color }]}
              >
                <Feather name="play" size={16} color={COLORS.bg} />
                <Text style={[styles.startTimerText, { fontFamily: FONTS.bodyBold }]}>
                  Lancer le chrono
                </Text>
              </TouchableOpacity>
            )}
            {workTimerStarted && !timerCompleted && (
              <TouchableOpacity
                onPress={() => setTimerCompleted(true)}
                style={styles.skipBtn}
              >
                <Text style={[styles.skipText, { fontFamily: FONTS.bodyMedium }]}>
                  Passer
                </Text>
              </TouchableOpacity>
            )}
            {timerCompleted && (
              <View style={[styles.timerDoneBadge, { backgroundColor: `${COLORS.green}20`, borderColor: `${COLORS.green}50` }]}>
                <Feather name="check-circle" size={14} color={COLORS.green} />
                <Text style={[styles.timerDoneText, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
                  CHRONO TERMINÉ
                </Text>
              </View>
            )}
          </View>
        )}

        {exercise.coachCue && exercise.coachCue.trim() !== (exercise.description ?? "").trim() ? (
          <View style={styles.cueBox}>
            <Feather name="message-square" size={14} color={COLORS.cyan} />
            <Text style={[styles.cueText, { fontFamily: FONTS.body }]}>{exercise.coachCue}</Text>
          </View>
        ) : null}

        {exercise.tempo ? (
          <View style={[styles.cueBox, { borderColor: "#A855F720" }]}>
            <Feather name="activity" size={14} color="#A855F7" />
            <Text style={[styles.cueText, { fontFamily: FONTS.mono, color: "#A855F7" }]}>
              Tempo : {exercise.tempo}
            </Text>
          </View>
        ) : null}

        {showRest && (exercise.restSeconds ?? 0) > 0 ? (
          <View style={styles.restContainer}>
            <CircularTimer
              ref={timerRef}
              durationSeconds={exercise.restSeconds!}
              onComplete={handleRestTimerComplete}
              autoStart={false}
            />
            <View style={styles.encourageBox}>
              <Text style={[styles.encourageText, { fontFamily: FONTS.bodyMedium }]}>
                {encouragementMsg}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSkipRest} style={styles.skipBtn}>
              <Text style={[styles.skipText, { fontFamily: FONTS.bodyMedium }]}>
                Passer le repos
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {nextExercise != null && (
          <View style={[styles.nextExRow, { borderColor: `${cfg.color}20` }]}>
            <View style={styles.nextExLeft}>
              <Text style={[styles.nextExLabel, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                SUIVANT
              </Text>
              <Text style={[styles.nextExName, { fontFamily: FONTS.bodyMedium }]} numberOfLines={1}>
                {nextExercise.exerciseName}
              </Text>
            </View>
            <Text style={[styles.nextExVolume, { fontFamily: FONTS.mono }]}>
              {nextExercise.sets}×{nextExercise.reps}
            </Text>
          </View>
        )}
      </ScrollView>

      {!showRest && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            onPress={handleSetDone}
            style={[
              styles.doneBtn,
              { backgroundColor: doneBtnDisabled ? COLORS.bgElevated : cfg.color },
            ]}
            activeOpacity={doneBtnDisabled ? 1 : 0.8}
          >
            <Feather name="check" size={22} color={doneBtnDisabled ? COLORS.textMuted : COLORS.bg} />
            <Text style={[styles.doneBtnText, { fontFamily: FONTS.bodyBold, color: doneBtnDisabled ? COLORS.textMuted : COLORS.bg }]}>
              {setDoneLabel()}
            </Text>
          </TouchableOpacity>
          {doneBtnDisabled && (
            <Text style={[styles.timerHint, { fontFamily: FONTS.body }]}>
              Lance et termine le chrono pour valider
            </Text>
          )}
        </View>
      )}

      <Modal
        visible={showDemoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDemoModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontFamily: FONTS.mono }]} numberOfLines={1}>
              {exercise.exerciseName}
            </Text>
            <TouchableOpacity onPress={() => setShowDemoModal(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {exercise.gifUrl != null && exercise.gifUrl.length > 0 ? (
            <Image
              source={{ uri: exercise.gifUrl }}
              style={styles.webView}
              resizeMode="contain"
            />
          ) : exercise.demoUrl != null && exercise.demoUrl.length > 0 ? (
            <WebView
              source={{ uri: exercise.demoUrl }}
              style={styles.webView}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoader}>
                  <ActivityIndicator size="large" color={cfg.color} />
                </View>
              )}
            />
          ) : (
            <View style={[styles.webViewLoader, { flex: 1 }]}>
              <Feather name="video-off" size={36} color={COLORS.textMuted} />
              <Text style={{ color: COLORS.textMuted, marginTop: 8, fontFamily: FONTS.body }}>Pas de démonstration disponible</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: COLORS.bg,
  },
  navBtn: { padding: 4 },
  navBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.35 },
  progressChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  progressText: { fontSize: 13 },
  ribbonWrapper: {
    height: 52,
    overflow: "hidden",
  },
  blockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  blockBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  blockBannerText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  ribbonContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  ribbonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 130,
  },
  ribbonPillCurrent: {
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  ribbonNum: { fontSize: 11, letterSpacing: 0.5 },
  ribbonName: { fontSize: 12, flexShrink: 1 },
  identityBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
    backgroundColor: COLORS.bg,
  },
  setLabel: { fontSize: 18, letterSpacing: 3 },
  exerciseName: { fontSize: 42, letterSpacing: 2, textAlign: "center", lineHeight: 48 },
  repsText: { fontSize: 26, color: COLORS.white, letterSpacing: 4 },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 24,
    paddingTop: 16,
  },
  loadSection: { alignItems: "center", gap: 14, width: "100%" },
  lastUsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: -6,
  },
  lastUsedText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.3 },
  prInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  workTimerContainer: { alignItems: "center", gap: 16, width: "100%" },
  startTimerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  startTimerText: { fontSize: 15, color: COLORS.bg },
  timerDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timerDoneText: { fontSize: 12, letterSpacing: 1 },
  cueBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
    padding: 14,
    width: "100%",
  },
  cueText: { flex: 1, fontSize: 14, color: COLORS.white, lineHeight: 20 },
  restContainer: { alignItems: "center", gap: 20, width: "100%" },
  encourageBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: "100%",
  },
  encourageText: { fontSize: 15, color: COLORS.white, textAlign: "center", lineHeight: 22 },
  skipBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipText: { fontSize: 14, color: COLORS.textSecondary },
  nextExRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  nextExLeft: { flex: 1, gap: 2 },
  nextExLabel: { fontSize: 9, letterSpacing: 2 },
  nextExName: { fontSize: 14, color: COLORS.white },
  nextExVolume: { fontSize: 13, color: COLORS.textSecondary, letterSpacing: 0.5 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
  },
  doneBtnText: { fontSize: 16, letterSpacing: 1 },
  timerHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  backHomeBtn: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equipmentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
  },
  equipmentTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  equipmentTag: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equipmentTagText: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.3 },
  descriptionBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
    width: "100%",
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  descriptionLabel: { fontSize: 10, letterSpacing: 1.5, flex: 1 },
  descriptionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  descriptionToggleText: { fontSize: 12, color: COLORS.textMuted },
  descriptionText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  demoBtnText: { fontSize: 13 },
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
