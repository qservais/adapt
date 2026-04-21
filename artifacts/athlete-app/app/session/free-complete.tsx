import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { getFreeSession, clearFreeSession } from "@/lib/freeSessionStore";

const { width } = Dimensions.get("window");

type FeatherIconName = keyof typeof Feather.glyphMap;
type Difficulty = "too_easy" | "well_calibrated" | "too_hard";

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; icon: FeatherIconName; color: string }[] = [
  { key: "too_easy", label: "Trop facile", icon: "thumbs-up", color: COLORS.cyan },
  { key: "well_calibrated", label: "Parfait", icon: "check-circle", color: COLORS.green },
  { key: "too_hard", label: "Trop dur", icon: "alert-triangle", color: COLORS.red },
];

const THEME_OPTIONS: { key: string; label: string; icon: FeatherIconName }[] = [
  { key: "strength", label: "Force", icon: "trending-up" },
  { key: "cardio", label: "Cardio", icon: "activity" },
  { key: "hiit", label: "HIIT", icon: "zap" },
  { key: "mobility", label: "Mobilité", icon: "wind" },
  { key: "mixed", label: "Mixte", icon: "layers" },
  { key: "recovery", label: "Récup", icon: "heart" },
];

function getRPEColor(rpe: number): string {
  if (rpe <= 4) return COLORS.green;
  if (rpe <= 7) return COLORS.cyan;
  return COLORS.red;
}

export default function FreeSessionCompleteScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const confettiRef = useRef<any>(null);
  const session = getFreeSession();

  const [rpe, setRpe] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("well_calibrated");
  const [theme, setTheme] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const statsY = useSharedValue(30);
  const statsOpacity = useSharedValue(0);

  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  useEffect(() => {
    if (!session) {
      router.replace("/");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    statsY.value = withDelay(500, withTiming(0, { duration: 500 }));
    statsOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    if (session.sessionLogId) {
      const completedExercises = (session.completedExercises ?? []).map(e => ({
        exerciseId: e.exerciseId,
        setsCompleted: e.setsCompleted,
        loadKgUsed: e.loadKgUsed ?? undefined,
      }));
      customFetch(`/api/sessions/${session.sessionLogId}/complete`, {
        method: "POST",
        body: JSON.stringify({ exercises: completedExercises }),
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  }, []);

  const handleFeedback = async () => {
    if (!session?.sessionLogId || feedbackSubmitted) {
      clearFreeSession();
      router.replace("/");
      return;
    }
    setIsSubmitting(true);
    try {
      await customFetch(`/api/sessions/${session.sessionLogId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rpe,
          perceivedDifficulty: difficulty,
          athleteNotes: notes.trim() || null,
          theme: theme ?? null,
        }),
        headers: { "Content-Type": "application/json" },
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today-all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setFeedbackSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    } finally {
      setIsSubmitting(false);
      clearFreeSession();
      router.replace("/");
    }
  };

  const celebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsY.value }],
    opacity: statsOpacity.value,
  }));

  const rpeColor = getRPEColor(rpe);

  if (!session) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: width / 2, y: -10 }}
        autoStart={true}
        colors={[COLORS.cyan, COLORS.violet, COLORS.green, COLORS.amber, COLORS.gold]}
        fadeOut
        explosionSpeed={350}
        fallSpeed={3000}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.trophy, celebrateStyle]}>
          <View style={[styles.trophyCircle, { borderColor: COLORS.cyan, backgroundColor: `${COLORS.cyan}15`, shadowColor: COLORS.cyan }]}>
            <Feather name="zap" size={72} color={COLORS.cyan} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textWrap, celebrateStyle]}>
          <View style={styles.freeBadge}>
            <Feather name="zap" size={12} color={COLORS.cyan} />
            <Text style={[styles.freeBadgeText, { fontFamily: FONTS.mono }]}>SÉANCE LIBRE</Text>
          </View>
          <Text style={[styles.congrats, { fontFamily: FONTS.title, color: COLORS.cyan }]}>
            TERMINÉE !
          </Text>
          <Text style={[styles.sessionName, { fontFamily: FONTS.body }]}>{session.name}</Text>
          <Text style={[styles.desc, { fontFamily: FONTS.body }]}>
            Excellent effort. Ta séance libre est enregistrée.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.statsRow, statsStyle]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
              {session.exercises.length}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Exercices</Text>
          </View>
          {session.estimatedDurationMin != null && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
                  {session.estimatedDurationMin}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Min</Text>
              </View>
            </>
          )}
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="zap" size={22} color={COLORS.cyan} />
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Libre</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.section, statsStyle]}>
          <View style={styles.sectionHeader}>
            <Feather name="star" size={16} color={COLORS.amber} />
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color: COLORS.amber }]}>MON RESSENTI</Text>
          </View>

          <Text style={[styles.rpeLabel, { fontFamily: FONTS.body }]}>
            Effort ressenti (RPE){" "}
            <Text style={[styles.rpeBig, { fontFamily: FONTS.monoBold, color: rpeColor }]}>{rpe}/10</Text>
          </Text>
          <View style={styles.rpeRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setRpe(v)}
                style={[
                  styles.rpeBtn,
                  { backgroundColor: rpe >= v ? `${getRPEColor(v)}30` : `${COLORS.border}` },
                  rpe === v && { borderColor: getRPEColor(v), borderWidth: 1.5 },
                ]}
              >
                <Text style={[styles.rpeBtnText, { fontFamily: FONTS.mono, color: rpe >= v ? getRPEColor(v) : COLORS.textMuted }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.diffRow}>
            {DIFFICULTY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setDifficulty(opt.key)}
                style={[styles.diffChip, difficulty === opt.key && { backgroundColor: `${opt.color}20`, borderColor: opt.color }]}
              >
                <Feather name={opt.icon} size={13} color={difficulty === opt.key ? opt.color : COLORS.textMuted} />
                <Text style={[styles.diffLabel, { fontFamily: FONTS.body, color: difficulty === opt.key ? opt.color : COLORS.textMuted }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.rpeLabel, { fontFamily: FONTS.body, marginTop: 4 }]}>Thème de séance</Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTheme(active ? null : opt.key); }}
                  style={[styles.themeChip, active && { borderColor: COLORS.cyan, backgroundColor: `${COLORS.cyan}15` }]}
                >
                  <Feather name={opt.icon} size={13} color={active ? COLORS.cyan : COLORS.textMuted} />
                  <Text style={[styles.diffLabel, { fontFamily: FONTS.body, color: active ? COLORS.cyan : COLORS.textMuted }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.notesInput, { fontFamily: FONTS.body }]}
            placeholder="Commentaire libre (optionnel)..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
        </Animated.View>

        <Animated.View style={[styles.actions, statsStyle]}>
          <GradientButton
            label={isSubmitting ? "Enregistrement..." : "Enregistrer mon ressenti"}
            onPress={handleFeedback}
            icon={<Feather name="check" size={18} color={COLORS.textInverse} />}
          />
          <TouchableOpacity onPress={() => { clearFreeSession(); router.replace("/"); }} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.body }]}>Passer</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 28, alignItems: "center", gap: 24 },
  trophy: { alignItems: "center" },
  trophyCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  textWrap: { alignItems: "center", gap: 10 },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${COLORS.cyan}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}40`,
  },
  freeBadgeText: { fontSize: 10, color: COLORS.cyan, letterSpacing: 1.5 },
  congrats: { fontSize: 40, letterSpacing: 3, textAlign: "center" },
  sessionName: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center" },
  desc: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statVal: { fontSize: 28 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  section: { width: "100%", backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  rpeLabel: { fontSize: 13, color: COLORS.textSecondary },
  rpeBig: { fontSize: 15 },
  rpeRow: { flexDirection: "row", gap: 4, justifyContent: "center", flexWrap: "wrap" },
  rpeBtn: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  rpeBtnText: { fontSize: 12 },
  diffRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  diffChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "transparent" },
  diffLabel: { fontSize: 12 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  themeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "transparent" },
  notesInput: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.white, fontSize: 14, minHeight: 60, textAlignVertical: "top" },
  actions: { width: "100%", gap: 12 },
  homeBtn: { alignItems: "center", paddingVertical: 14 },
  homeBtnText: { fontSize: 15, color: COLORS.textSecondary },
});
