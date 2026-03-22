import React, { useEffect, useRef } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import { useGetTodaySession, useCompleteSession } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";

const { width } = Dimensions.get("window");

export default function SessionCompleteScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sessionQuery = useGetTodaySession();
  const completeMutation = useCompleteSession();
  const confettiRef = useRef<any>(null);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const statsY = useSharedValue(30);
  const statsOpacity = useSharedValue(0);

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  const newPRs = completeMutation.data?.newPRs ?? [];
  const newBadges = completeMutation.data?.newBadges ?? [];
  const hasPRs = newPRs.length > 0;

  // Animations and session completion trigger
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    statsY.value = withDelay(500, withTiming(0, { duration: 500 }));
    statsOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    if (session?.sessionLogId != null) {
      completeMutation.mutate(
        { sessionId: session.sessionLogId, data: { exercises: [] } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sessions/today"] });
          },
        }
      );
    }
  }, []);

  // Fire confetti once PRs are available (mutation resolves after mount)
  useEffect(() => {
    if (hasPRs) {
      setTimeout(() => confettiRef.current?.start(), 300);
    }
  }, [hasPRs]);

  const celebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsY.value }],
    opacity: statsOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
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
                  {pr.previousLoadKg != null && (
                    <Text style={[styles.prPrev, { fontFamily: FONTS.mono }]}>
                      {pr.previousLoadKg} kg →
                    </Text>
                  )}
                  <Text style={[styles.prNew, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
                    {pr.loadKg} kg
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

        <Animated.View style={[styles.actions, statsStyle]}>
          <GradientButton
            label="Donner un retour"
            onPress={() => router.replace("/session/feedback")}
            icon={<Feather name="star" size={18} color={COLORS.textInverse} />}
          />
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.body }]}>
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
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
  actions: { width: "100%", gap: 12 },
  homeBtn: { alignItems: "center", paddingVertical: 14 },
  homeBtnText: { fontSize: 15, color: COLORS.textSecondary },
});
