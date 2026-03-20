import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import { useGetTodaySession } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { CircularTimer, type CircularTimerRef } from "@/components/ui/CircularTimer";
import { Stepper } from "@/components/ui/Stepper";
import { ProgressBar } from "@/components/ui/ProgressBar";

const CATEGORY_IMAGES: Record<string, ReturnType<typeof require>> = {
  compound: require("@/assets/images/categories/compound.png"),
  isolation: require("@/assets/images/categories/isolation.png"),
  cardio: require("@/assets/images/categories/cardio.png"),
  mobility: require("@/assets/images/categories/mobility.png"),
  plyometric: require("@/assets/images/categories/plyometric.png"),
};

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

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const timerRef = useRef<CircularTimerRef>(null);
  const session = sessionQuery.data;
  const exercises = session?.exercises ?? [];
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;
  const athletePRs = (session as any)?.athletePRs as Record<string, number> | undefined;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [showRest, setShowRest] = useState(false);
  const [loadAdjustments, setLoadAdjustments] = useState<Record<string, number>>({});

  const exercise = exercises[exerciseIndex];
  const totalExercises = exercises.length;
  const isLast = exerciseIndex === totalExercises - 1;

  const adjustLoad = useCallback((exId: string, next: number) => {
    setLoadAdjustments((prev) => ({ ...prev, [exId]: next }));
  }, []);

  const handleSetDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentSet < (exercise?.sets ?? 1)) {
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
  };

  const handleTimerComplete = () => {
    setShowRest(false);
    setCurrentSet((s) => s + 1);
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

  const currentLoad = loadAdjustments[exercise.id] ?? exercise.adaptedLoadKg ?? exercise.nominalLoadKg ?? 0;
  const progress = exerciseIndex / totalExercises;
  const currentPR = athletePRs?.[exercise.exerciseId];
  const isAbovePR = currentPR != null && currentLoad > currentPR;

  const setDoneLabel = () => {
    if (currentSet < (exercise.sets ?? 1)) return `Série ${currentSet} terminée`;
    if (isLast) return "Terminer la séance";
    return "Exercice suivant";
  };

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
          style={styles.closeBtn}
        >
          <Feather name="x" size={22} color={COLORS.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar
            progress={exerciseIndex}
            total={totalExercises}
            color={cfg.color}
            height={4}
          />
        </View>
        <Text style={[styles.progressText, { fontFamily: FONTS.mono }]}>
          {exerciseIndex + 1}/{totalExercises}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.setLabel, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
          SÉRIE {currentSet}/{exercise.sets}
        </Text>

        {exercise.category && CATEGORY_IMAGES[exercise.category] ? (
          <Image
            source={CATEGORY_IMAGES[exercise.category]}
            style={styles.exerciseImage}
            resizeMode="cover"
          />
        ) : null}

        <Text style={[styles.exerciseName, { fontFamily: FONTS.title, color: cfg.color }]}>
          {exercise.exerciseName}
        </Text>
        <Text style={[styles.repsText, { fontFamily: FONTS.mono }]}>
          {exercise.reps} REPS
        </Text>

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

        {exercise.coachCue ? (
          <View style={styles.cueBox}>
            <Feather name="message-square" size={14} color={COLORS.cyan} />
            <Text style={[styles.cueText, { fontFamily: FONTS.body }]}>{exercise.coachCue}</Text>
          </View>
        ) : null}

        {showRest && (exercise.restSeconds ?? 0) > 0 ? (
          <View style={styles.restContainer}>
            <CircularTimer
              ref={timerRef}
              durationSeconds={exercise.restSeconds!}
              onComplete={handleTimerComplete}
              autoStart={false}
            />
            <TouchableOpacity onPress={handleSkipRest} style={styles.skipBtn}>
              <Text style={[styles.skipText, { fontFamily: FONTS.bodyMedium }]}>
                Passer le repos
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {!showRest && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            onPress={handleSetDone}
            style={[styles.doneBtn, { backgroundColor: cfg.color }]}
          >
            <Feather name="check" size={22} color={COLORS.bg} />
            <Text style={[styles.doneBtnText, { fontFamily: FONTS.bodyBold }]}>
              {setDoneLabel()}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  closeBtn: { padding: 4 },
  progressText: { fontSize: 12, color: COLORS.textMuted, minWidth: 36, textAlign: "right" },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 24,
    paddingTop: 16,
  },
  setLabel: { fontSize: 13, letterSpacing: 2 },
  exerciseImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
  },
  exerciseName: { fontSize: 44, letterSpacing: 2, textAlign: "center", lineHeight: 48 },
  repsText: { fontSize: 32, color: COLORS.white, letterSpacing: 4 },
  loadSection: { alignItems: "center", gap: 14, width: "100%" },
  prInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  cueBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}40`,
    padding: 14,
    width: "100%",
  },
  cueText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  restContainer: { alignItems: "center", gap: 20 },
  skipBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipText: { fontSize: 14, color: COLORS.textSecondary },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
  },
  doneBtnText: { fontSize: 16, color: COLORS.bg, letterSpacing: 0.5 },
  backHomeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
