import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetTodaySession, useStartSession } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GlowCard } from "@/components/ui/GlowCard";

export default function SessionIntroScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const startMutation = useStartSession();

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  if (!session) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Feather name="lock" size={40} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            Complete your check-in first
          </Text>
        </View>
      </View>
    );
  }

  const [startError, setStartError] = React.useState("");

  const handleStart = async () => {
    setStartError("");
    try {
      await startMutation.mutateAsync({ sessionId: session.sessionLogId });
      router.push("/session/exercise");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start session";
      setStartError(msg);
    }
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <ModeBadge mode={modeKey} size="sm" glow />
      </View>

      <View style={[styles.heroSection, { borderColor: cfg.color }]}>
        <Text style={[styles.heroTitle, { fontFamily: FONTS.title, color: cfg.color }]}>
          {session.name}
        </Text>
        <View style={styles.heroMeta}>
          {session.estimatedDurationMin != null && (
            <View style={styles.metaItem}>
              <Feather name="clock" size={16} color={COLORS.textSecondary} />
              <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
                {session.estimatedDurationMin} MIN
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Feather name="list" size={16} color={COLORS.textSecondary} />
            <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
              {session.exercises?.length ?? 0} EXERCICES
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.scoreRow,
            { backgroundColor: cfg.dim, borderColor: cfg.color },
          ]}
        >
          <Text style={[styles.scoreLabel, { fontFamily: FONTS.mono }]}>ADAPT SCORE</Text>
          <Text style={[styles.scoreVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
            {session.adaptScore}
          </Text>
        </View>
      </View>

      {session.coachNotes != null && (
        <GlowCard glowColor={COLORS.cyan} style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <Feather name="message-square" size={16} color={COLORS.cyan} />
            <Text style={[styles.coachLabel, { fontFamily: FONTS.mono }]}>
              COACH NOTES
            </Text>
          </View>
          <Text style={[styles.coachText, { fontFamily: FONTS.body }]}>
            {session.coachNotes}
          </Text>
        </GlowCard>
      )}

      <View style={styles.exerciseList}>
        <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
          PROGRAMME
        </Text>
        {session.exercises?.map((ex, i) => (
          <View key={ex.id} style={styles.exRow}>
            <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
              {String(i + 1).padStart(2, "0")}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>
                {ex.exerciseName}
              </Text>
              <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                {ex.sets}×{ex.reps}
                {ex.adaptedLoadKg != null ? ` · ${ex.adaptedLoadKg}kg` : ""}
                {ex.restSeconds != null ? ` · ${ex.restSeconds}s rest` : ""}
              </Text>
              {ex.coachCue != null && (
                <Text style={[styles.exCue, { fontFamily: FONTS.body }]}>
                  {ex.coachCue}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {startError ? (
        <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{startError}</Text>
      ) : null}
      <TouchableOpacity
        onPress={handleStart}
        disabled={startMutation.isPending}
        style={[styles.startBtn, { backgroundColor: cfg.color, opacity: startMutation.isPending ? 0.6 : 1 }]}
      >
        <Feather name="play" size={20} color={COLORS.bg} />
        <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>
          {startMutation.isPending ? "STARTING…" : "DÉMARRER LA SÉANCE"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: { padding: 4 },
  heroSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
    gap: 16,
  },
  heroTitle: { fontSize: 44, letterSpacing: 2, lineHeight: 48 },
  heroMeta: { flexDirection: "row", gap: 20 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scoreLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5 },
  scoreVal: { fontSize: 24 },
  coachCard: { marginHorizontal: 20, marginBottom: 16, gap: 10 },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachLabel: { fontSize: 10, color: COLORS.cyan, letterSpacing: 2 },
  coachText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  exerciseList: { paddingHorizontal: 20, marginBottom: 24, gap: 2 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 16 },
  exRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: "flex-start",
  },
  exNum: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, minWidth: 28 },
  exName: { fontSize: 16, color: COLORS.white, marginBottom: 3 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary },
  exCue: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginTop: 3 },
  startBtn: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 12,
  },
  startBtnText: { fontSize: 16, color: COLORS.bg, letterSpacing: 1.5 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center", marginHorizontal: 20, marginBottom: 8 },
});
