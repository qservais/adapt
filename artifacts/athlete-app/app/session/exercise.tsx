import React, { useCallback, useEffect, useState } from "react";
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
import { useGetTodaySession } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";

const CATEGORY_IMAGES: Record<string, ReturnType<typeof require>> = {
  compound: require("@/assets/images/categories/compound.png"),
  isolation: require("@/assets/images/categories/isolation.png"),
  cardio: require("@/assets/images/categories/cardio.png"),
  mobility: require("@/assets/images/categories/mobility.png"),
  plyometric: require("@/assets/images/categories/plyometric.png"),
};

function RestTimer({
  seconds,
  onSkip,
}: {
  seconds: number;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    if (seconds <= 0) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <View style={timerStyles.container}>
      <Text style={[timerStyles.label, { fontFamily: FONTS.mono }]}>REPOS</Text>
      <Text style={[timerStyles.timer, { fontFamily: FONTS.mono }]}>
        {mins}:{String(secs).padStart(2, "0")}
      </Text>
      <TouchableOpacity onPress={onSkip} style={timerStyles.skipBtn}>
        <Text style={[timerStyles.skipText, { fontFamily: FONTS.bodyMedium }]}>
          Passer le repos
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
  },
  label: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  timer: { fontSize: 52, color: COLORS.cyan },
  skipBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipText: { fontSize: 13, color: COLORS.textSecondary },
});

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
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

  const adjustLoad = useCallback((exId: string, delta: number, base: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoadAdjustments((prev) => {
      const current = prev[exId] ?? base;
      return { ...prev, [exId]: Math.max(0, current + delta) };
    });
  }, []);

  const handleSetDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentSet < (exercise?.sets ?? 1)) {
      if ((exercise?.restSeconds ?? 0) > 0) {
        setShowRest(true);
      } else {
        setCurrentSet((s) => s + 1);
      }
    } else {
      handleExerciseDone();
    }
  };

  const handleExerciseDone = () => {
    setShowRest(false);
    if (isLast) {
      router.replace("/session/complete");
    } else {
      setExerciseIndex((i) => i + 1);
      setCurrentSet(1);
    }
  };

  const handleSkipRest = () => {
    setShowRest(false);
    setCurrentSet((s) => s + 1);
  };

  if (sessionQuery.isPending || (sessionQuery.isFetching && !session)) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 16 }]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={[{ color: COLORS.textSecondary, fontFamily: FONTS.body }]}>
          Chargement de la séance...
        </Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 }]}>
        <Feather name="alert-circle" size={40} color={COLORS.textMuted} />
        <Text style={[{ color: COLORS.textSecondary, fontFamily: FONTS.body, textAlign: "center" }]}>
          Aucun exercice disponible pour cette séance.
        </Text>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backHomeBtn}>
          <Text style={[{ color: COLORS.white, fontFamily: FONTS.bodyMedium }]}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentLoad = loadAdjustments[exercise.id] ?? exercise.adaptedLoadKg ?? exercise.nominalLoadKg ?? 0;
  const progress = ((exerciseIndex) / totalExercises) * 100;
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
              "Tu pourras reprendre depuis le début après ta prochaine vérification.",
              [
                { text: "Continuer", style: "cancel" },
                {
                  text: "Quitter",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ]
            );
          }}
          style={styles.closeBtn}
        >
          <Feather name="x" size={22} color={COLORS.textSecondary} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: cfg.color }]} />
          </View>
          <Text style={[styles.progressText, { fontFamily: FONTS.mono }]}>
            {exerciseIndex + 1}/{totalExercises}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.setLabel, { fontFamily: FONTS.mono }]}>
          SÉRIE {currentSet}/{exercise.sets}
        </Text>
        {(exercise.category && CATEGORY_IMAGES[exercise.category]) ? (
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
            <View style={styles.loadRow}>
              <TouchableOpacity
                onPress={() => adjustLoad(exercise.id, -2.5, currentLoad)}
                style={styles.loadBtn}
              >
                <Feather name="minus" size={22} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.loadDisplay}>
                <Text style={[styles.loadVal, { fontFamily: FONTS.monoBold }]}>
                  {currentLoad}
                </Text>
                <Text style={[styles.loadUnit, { fontFamily: FONTS.mono }]}>kg</Text>
              </View>
              <TouchableOpacity
                onPress={() => adjustLoad(exercise.id, 2.5, currentLoad)}
                style={styles.loadBtn}
              >
                <Feather name="plus" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            {currentPR != null && (
              <View style={[styles.prBadge, isAbovePR ? styles.prBadgeAbove : styles.prBadgeBelow]}>
                {isAbovePR ? (
                  <Feather name="trending-up" size={12} color={COLORS.green} />
                ) : (
                  <Feather name="award" size={12} color={COLORS.textMuted} />
                )}
                <Text style={[
                  styles.prText,
                  { fontFamily: FONTS.mono },
                  isAbovePR ? { color: COLORS.green } : { color: COLORS.textMuted },
                ]}>
                  {isAbovePR ? `NOUVEAU RECORD ! (${currentPR} kg)` : `RECORD : ${currentPR} kg`}
                </Text>
              </View>
            )}
          </View>
        )}

        {exercise.coachCue && (
          <View style={styles.cueBox}>
            <Feather name="message-square" size={14} color={COLORS.cyan} />
            <Text style={[styles.cueText, { fontFamily: FONTS.body }]}>
              {exercise.coachCue}
            </Text>
          </View>
        )}

        {showRest && (exercise.restSeconds ?? 0) > 0 && (
          <RestTimer
            seconds={exercise.restSeconds!}
            onSkip={handleSkipRest}
          />
        )}
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
  progressWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBg: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 12, color: COLORS.textMuted, minWidth: 36, textAlign: "right" },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 24,
    paddingTop: 16,
  },
  setLabel: { fontSize: 13, color: COLORS.textMuted, letterSpacing: 2 },
  exerciseImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: COLORS.bgCard,
  },
  exerciseName: { fontSize: 44, letterSpacing: 2, textAlign: "center", lineHeight: 48 },
  repsText: { fontSize: 32, color: COLORS.white, letterSpacing: 4 },
  loadSection: { alignItems: "center", gap: 10, width: "100%" },
  loadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadDisplay: { alignItems: "center" },
  loadVal: { fontSize: 38, color: COLORS.white },
  loadUnit: { fontSize: 14, color: COLORS.textSecondary },
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  prBadgeAbove: { backgroundColor: COLORS.greenDim, borderColor: COLORS.green },
  prBadgeBelow: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  prText: { fontSize: 11, letterSpacing: 1 },
  cueBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    padding: 14,
    width: "100%",
  },
  cueText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
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
