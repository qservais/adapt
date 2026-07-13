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
import { router, useLocalSearchParams } from "expo-router";
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
import {
  useGetTodaySession,
  useCompleteSession,
  useSubmitSessionFeedback,
} from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { useFormatWeight } from "@/context/PreferencesContext";
import { formatRecordValue } from "@/lib/formatRecord";

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

export default function SessionCompleteScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sessionQuery = useGetTodaySession();
  const completeMutation = useCompleteSession();
  const feedbackMutation = useSubmitSessionFeedback();
  const confettiRef = useRef<any>(null);
  const params = useLocalSearchParams<{ bonusSets?: string }>();
  const _parsedBonus = params.bonusSets != null ? parseInt(params.bonusSets, 10) : 0;
  const bonusSets = Number.isFinite(_parsedBonus) && _parsedBonus > 0 ? _parsedBonus : 0;

  const [rpe, setRpe] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("well_calibrated");
  const [theme, setTheme] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const statsY = useSharedValue(30);
  const statsOpacity = useSharedValue(0);

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  const isInPerson =
    session?.sessionLocation === "presentiel" &&
    (session?.exercises?.length ?? 0) === 0;

  useEffect(() => {
    if (session?.sessionType != null && theme === null) {
      setTheme(session.sessionType);
    }
  }, [session?.sessionType]);

  const formatWeight = useFormatWeight();
  const newPRs = completeMutation.data?.newPRs ?? [];
  const newBadges = completeMutation.data?.newBadges ?? [];
  const hasPRs = newPRs.length > 0;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    statsY.value = withDelay(500, withTiming(0, { duration: 500 }));
    statsOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    if (!isInPerson && session?.sessionLogId != null) {
      completeMutation.mutate(
        { sessionId: session.sessionLogId, data: { exercises: [] } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sessions/today"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sessions/today-all"] });
          },
        }
      );
    }
  }, []);

  useEffect(() => {
    if (hasPRs) {
      setTimeout(() => confettiRef.current?.start(), 300);
    }
  }, [hasPRs]);

  const handleFeedback = async () => {
    if (session?.sessionLogId == null || feedbackSubmitted) {
      router.replace("/");
      return;
    }
    try {
      await feedbackMutation.mutateAsync({
        sessionId: session.sessionLogId,
        data: { rpe, perceivedDifficulty: difficulty, athleteNotes: notes.trim() || null, theme: theme ?? null },
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today-all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setFeedbackSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch {
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

  if (isInPerson) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: COLORS.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.trophy, celebrateStyle]}>
            <View
              style={[
                styles.trophyCircle,
                {
                  borderColor: COLORS.green,
                  backgroundColor: `${COLORS.green}15`,
                  shadowColor: COLORS.green,
                },
              ]}
            >
              <Feather name="users" size={72} color={COLORS.green} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.textWrap, celebrateStyle]}>
            <Text style={[styles.congrats, { fontFamily: FONTS.title, color: COLORS.green }]}>
              PRÉSENCE ENREGISTRÉE !
            </Text>
            <Text style={[styles.desc, { fontFamily: FONTS.body }]}>
              Bonne séance avec ton coach !{"\n"}Continue comme ça, tu es sur la bonne voie.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.inPersonCard, statsStyle]}>
            <View style={styles.inPersonRow}>
              <View style={[styles.inPersonIconWrap, { backgroundColor: `${COLORS.green}20` }]}>
                <Feather name="check-circle" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inPersonTextWrap}>
                <Text style={[styles.inPersonTitle, { fontFamily: FONTS.bodyBold }]}>
                  Séance présentielle
                </Text>
                <Text style={[styles.inPersonSub, { fontFamily: FONTS.body }]}>
                  Ta présence a bien été confirmée auprès de ton coach.
                </Text>
              </View>
            </View>

            <View style={[styles.inPersonDivider]} />

            <View style={styles.inPersonRow}>
              <View style={[styles.inPersonIconWrap, { backgroundColor: `${COLORS.cyan}20` }]}>
                <Feather name="calendar" size={20} color={COLORS.cyan} />
              </View>
              <View style={styles.inPersonTextWrap}>
                <Text style={[styles.inPersonTitle, { fontFamily: FONTS.bodyBold }]}>
                  Séance enregistrée
                </Text>
                <Text style={[styles.inPersonSub, { fontFamily: FONTS.body }]}>
                  Cette séance sera comptabilisée dans ton historique d'entraînement.
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.actions, statsStyle]}>
            <GradientButton
              label="Retour à l'accueil"
              onPress={() => router.replace("/")}
              icon={<Feather name="home" size={18} color={COLORS.textInverse} />}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {hasPRs && (
        <ConfettiCannon
          ref={confettiRef}
          count={120}
          origin={{ x: width / 2, y: -10 }}
          autoStart={false}
          colors={[COLORS.cyan, COLORS.violet, COLORS.green, COLORS.amber, COLORS.gold]}
          fadeOut
          explosionSpeed={350}
          fallSpeed={3000}
        />
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.trophy, celebrateStyle]}>
          <View
            style={[
              styles.trophyCircle,
              {
                borderColor: cfg.color,
                backgroundColor: `${cfg.color}15`,
                shadowColor: cfg.color,
              },
            ]}
          >
            <Feather name="award" size={72} color={cfg.color} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textWrap, celebrateStyle]}>
          <Text style={[styles.congrats, { fontFamily: FONTS.title, color: cfg.color }]}>
            SÉANCE TERMINÉE !
          </Text>
          <Text style={[styles.desc, { fontFamily: FONTS.body }]}>
            Excellent travail. Ton effort est enregistré.
          </Text>
        </Animated.View>

        {session != null && (
          <Animated.View style={[styles.statsRow, statsStyle]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.exercises?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Exercices</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {completeMutation.data?.durationMin ?? session.estimatedDurationMin ?? "—"}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.adaptScore}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Score</Text>
            </View>
          </Animated.View>
        )}

        {bonusSets > 0 && (
          <Animated.View style={[styles.bonusBanner, statsStyle]}>
            <Feather name="zap" size={16} color={COLORS.amber} />
            <Text style={[styles.bonusText, { fontFamily: FONTS.bodyBold, color: COLORS.amber }]}>
              {`Tu as réalisé ${bonusSets} série${bonusSets > 1 ? "s" : ""} de plus que prévu !`}
            </Text>
          </Animated.View>
        )}

        {hasPRs && (
          <Animated.View style={[styles.section, statsStyle]}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={16} color={COLORS.green} />
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color: COLORS.green }]}>
                NOUVEAUX RECORDS ({newPRs.length})
              </Text>
            </View>
            {newPRs.map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <Text style={[styles.prName, { fontFamily: FONTS.bodyMedium }]}>
                  {pr.exerciseName}
                </Text>
                <View style={styles.prLoads}>
                  {pr.previousValue != null && (
                    <Text style={[styles.prPrev, { fontFamily: FONTS.mono }]}>
                      {formatRecordValue(pr.recordType, pr.previousValue, formatWeight)} →
                    </Text>
                  )}
                  <Text style={[styles.prNew, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
                    {formatRecordValue(pr.recordType, pr.value, formatWeight)}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {newBadges.length > 0 && (
          <Animated.View style={[styles.section, statsStyle]}>
            <View style={styles.sectionHeader}>
              <Feather name="award" size={16} color={COLORS.cyan} />
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color: COLORS.cyan }]}>
                BADGES DÉBLOQUÉS ({newBadges.length})
              </Text>
            </View>
            <View style={styles.badgeRow}>
              {newBadges.map((b) => (
                <View key={b.code} style={styles.badgePill}>
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <Text style={[styles.badgeName, { fontFamily: FONTS.bodyMedium }]}>{b.name}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View style={[styles.section, statsStyle]}>
          <View style={styles.sectionHeader}>
            <Feather name="star" size={16} color={COLORS.amber} />
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color: COLORS.amber }]}>
              MON RESSENTI
            </Text>
          </View>

          <Text style={[styles.rpeLabel, { fontFamily: FONTS.body }]}>
            Effort ressenti (RPE){" "}
            <Text style={[styles.rpeBig, { fontFamily: FONTS.monoBold, color: rpeColor }]}>
              {rpe}/10
            </Text>
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
                <Text style={[styles.rpeBtnText, { fontFamily: FONTS.mono, color: rpe >= v ? getRPEColor(v) : COLORS.textMuted }]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.diffRow}>
            {DIFFICULTY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setDifficulty(opt.key)}
                style={[
                  styles.diffChip,
                  difficulty === opt.key && { backgroundColor: `${opt.color}20`, borderColor: opt.color },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={13}
                  color={difficulty === opt.key ? opt.color : COLORS.textMuted}
                />
                <Text style={[
                  styles.diffLabel,
                  { fontFamily: FONTS.body, color: difficulty === opt.key ? opt.color : COLORS.textMuted },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.rpeLabel, { fontFamily: FONTS.body, marginTop: 4 }]}>
            Thème de séance
          </Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTheme(active ? null : opt.key);
                  }}
                  style={[
                    styles.themeChip,
                    active && { borderColor: COLORS.cyan, backgroundColor: `${COLORS.cyan}15` },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={13}
                    color={active ? COLORS.cyan : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.diffLabel,
                    { fontFamily: FONTS.body, color: active ? COLORS.cyan : COLORS.textMuted },
                  ]}>
                    {opt.label}
                  </Text>
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
            label={feedbackMutation.isPending ? "Enregistrement..." : "Enregistrer mon ressenti"}
            onPress={handleFeedback}
            icon={<Feather name="check" size={18} color={COLORS.textInverse} />}
          />
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.body }]}>
              Passer
            </Text>
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
  congrats: { fontSize: 40, letterSpacing: 3, textAlign: "center" },
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
  section: {
    width: "100%",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  prName: { fontSize: 14, color: COLORS.white, flex: 1 },
  prLoads: { flexDirection: "row", alignItems: "center", gap: 6 },
  prPrev: { fontSize: 12, color: COLORS.textMuted },
  prNew: { fontSize: 14 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}60`,
  },
  badgeIcon: { fontSize: 16 },
  badgeName: { fontSize: 12, color: COLORS.white },
  rpeLabel: { fontSize: 13, color: COLORS.textSecondary },
  rpeBig: { fontSize: 15 },
  rpeRow: { flexDirection: "row", gap: 4, justifyContent: "center", flexWrap: "wrap" },
  rpeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rpeBtnText: { fontSize: 12 },
  diffRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  diffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  diffLabel: { fontSize: 12 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  notesInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  actions: { width: "100%", gap: 12 },
  homeBtn: { alignItems: "center", paddingVertical: 14 },
  homeBtnText: { fontSize: 15, color: COLORS.textSecondary },
  bonusBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${COLORS.amber}15`,
    borderWidth: 1,
    borderColor: `${COLORS.amber}50`,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bonusText: { fontSize: 14, flex: 1 },
  inPersonCard: {
    width: "100%",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.green}40`,
    padding: 16,
    gap: 14,
  },
  inPersonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  inPersonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inPersonTextWrap: {
    flex: 1,
    gap: 3,
  },
  inPersonTitle: {
    fontSize: 14,
    color: COLORS.white,
  },
  inPersonSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  inPersonDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
