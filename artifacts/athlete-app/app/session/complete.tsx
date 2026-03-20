import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    opacity.value = withDelay(100, withSpring(1));

    if (session?.sessionLogId) {
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

  const handleFeedback = () => {
    router.replace("/session/feedback" as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <Animated.View style={[styles.trophy, celebrateStyle]}>
          <View style={[styles.trophyCircle, { borderColor: cfg.color, backgroundColor: cfg.dim }]}>
            <Feather name="award" size={64} color={cfg.color} />
          </View>
        </Animated.View>

        <Text style={[styles.congrats, { fontFamily: FONTS.title, color: cfg.color }]}>
          SESSION COMPLETE!
        </Text>
        <Text style={[styles.desc, { fontFamily: FONTS.body }]}>
          Great work today. Your effort is logged and your coach will see it.
        </Text>

        {session && (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.exercises?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Exercices</Text>
            </View>
            <View style={[styles.divider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.estimatedDurationMin ?? "—"}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Min</Text>
            </View>
            <View style={[styles.divider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                {session.adaptScore}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Score</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleFeedback}
            style={[styles.feedbackBtn, { backgroundColor: cfg.color }]}
          >
            <Feather name="star" size={18} color={COLORS.bg} />
            <Text style={[styles.feedbackBtnText, { fontFamily: FONTS.bodyBold }]}>
              Leave Feedback
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/" as any)}
            style={styles.homeBtn}
          >
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.body }]}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "space-around",
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
