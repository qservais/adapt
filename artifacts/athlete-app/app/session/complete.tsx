import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useGetTodaySession, useCompleteSession } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";

export default function SessionCompleteScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const completeMutation = useCompleteSession();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  const newPRs: Array<{ exerciseName: string; loadKg: number; previousLoadKg?: number | null }> =
    (completeMutation.data as any)?.newPRs ?? [];
  const newBadges: Array<{ code: string; name: string; icon: string }> =
    (completeMutation.data as any)?.newBadges ?? [];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(100, withSpring(1));

    if (session?.sessionLogId != null) {
      completeMutation.mutate({
        sessionId: session.sessionLogId,
        data: { exercises: [] },
      });
    }
  }, []);

  const celebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.trophy, celebrateStyle]}>
          <View style={[styles.trophyCircle, { borderColor: cfg.color, backgroundColor: cfg.dim }]}>
            <Feather name="award" size={64} color={cfg.color} />
          </View>
        </Animated.View>

        <Text style={[styles.congrats, { fontFamily: FONTS.title, color: cfg.color }]}>
          SÉANCE TERMINÉE !
        </Text>
        <Text style={[styles.desc, { fontFamily: FONTS.body }]}>
          Excellent travail. Ton effort est enregistré et ton coach le verra.
        </Text>

        {session != null && (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.exercises?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Exercices</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.estimatedDurationMin ?? "—"}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Min</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.adaptScore}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Score</Text>
            </View>
          </View>
        )}

        {newPRs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={16} color={COLORS.green} />
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color: COLORS.green }]}>
                NOUVEAUX RECORDS ({newPRs.length})
              </Text>
            </View>
            {newPRs.map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <Text style={[styles.prName, { fontFamily: FONTS.bodyMedium }]}>{pr.exerciseName}</Text>
                <View style={styles.prLoads}>
                  {pr.previousLoadKg != null && (
                    <Text style={[styles.prPrev, { fontFamily: FONTS.mono }]}>{pr.previousLoadKg} kg →</Text>
                  )}
                  <Text style={[styles.prNew, { fontFamily: FONTS.monoBold }]}>{pr.loadKg} kg</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {newBadges.length > 0 && (
          <View style={styles.section}>
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
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.replace("/session/feedback")}
            style={[styles.feedbackBtn, { backgroundColor: cfg.color }]}
          >
            <Feather name="star" size={18} color={COLORS.bg} />
            <Text style={[styles.feedbackBtnText, { fontFamily: FONTS.bodyBold }]}>
              Donner un retour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={styles.homeBtn}
          >
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.body }]}>
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 24,
  },
  trophy: { alignItems: "center" },
  trophyCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  congrats: { fontSize: 40, letterSpacing: 3, textAlign: "center" },
  desc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  stats: {
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
  divider: { width: 1, height: 40, backgroundColor: COLORS.border },
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
  prNew: { fontSize: 14, color: COLORS.green },
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
    borderColor: COLORS.cyan,
  },
  badgeIcon: { fontSize: 16 },
  badgeName: { fontSize: 12, color: COLORS.white },
  actions: { width: "100%", gap: 12 },
  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
  },
  feedbackBtnText: { fontSize: 16, color: COLORS.bg },
  homeBtn: { alignItems: "center", paddingVertical: 14 },
  homeBtnText: { fontSize: 15, color: COLORS.textSecondary },
});
