import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetTodaySession,
  useGetSessionHistory,
  useGetTodayCheckin,
} from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GlowCard } from "@/components/ui/GlowCard";

export default function SessionTab() {
  const insets = useSafeAreaInsets();
  const checkinQuery = useGetTodayCheckin();
  const sessionQuery = useGetTodaySession();
  const historyQuery = useGetSessionHistory();

  const hasCheckin = checkinQuery.data != null;
  const session = sessionQuery.data;
  const modeKey = (checkinQuery.data?.sessionMode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 49 + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>SÉANCE</Text>

      {!hasCheckin ? (
        <View style={styles.section}>
          <GlowCard glowColor={COLORS.border}>
            <View style={styles.lockState}>
              <Feather name="lock" size={32} color={COLORS.textMuted} />
              <Text style={[styles.lockTitle, { fontFamily: FONTS.bodyBold }]}>
                Check-in requis
              </Text>
              <Text style={[styles.lockDesc, { fontFamily: FONTS.body }]}>
                Effectue ton check-in matinal pour débloquer la séance du jour.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/checkin")}
                style={styles.lockBtn}
              >
                <Text style={[styles.lockBtnText, { fontFamily: FONTS.bodyBold }]}>
                  Faire le check-in
                </Text>
              </TouchableOpacity>
            </View>
          </GlowCard>
        </View>
      ) : session != null ? (
        <View style={styles.section}>
          <GlowCard glowColor={cfg.color} intensity="medium">
            <View style={styles.sessionMeta}>
              <ModeBadge mode={modeKey} size="md" glow />
              {session.estimatedDurationMin != null && (
                <View style={styles.durationPill}>
                  <Feather name="clock" size={13} color={COLORS.textSecondary} />
                  <Text style={[styles.durationText, { fontFamily: FONTS.mono }]}>
                    {session.estimatedDurationMin} min
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.sessionName, { fontFamily: FONTS.title, color: cfg.color }]}>
              {session.name}
            </Text>
            <Text style={[styles.exerciseCount, { fontFamily: FONTS.body }]}>
              {session.exercises?.length ?? 0} exercices
            </Text>

            <View style={styles.exercisePreview}>
              {session.exercises?.slice(0, 4).map((ex, i) => (
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
                      {ex.adaptedLoadKg != null ? ` @ ${ex.adaptedLoadKg}kg` : ""}
                    </Text>
                  </View>
                </View>
              ))}
              {(session.exercises?.length ?? 0) > 4 && (
                <Text style={[styles.moreEx, { fontFamily: FONTS.body }]}>
                  +{session.exercises!.length - 4} de plus
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/session")}
              style={[styles.startBtn, { backgroundColor: cfg.color }]}
            >
              <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>
                DÉMARRER LA SÉANCE
              </Text>
              <Feather name="arrow-right" size={18} color={COLORS.bg} />
            </TouchableOpacity>
          </GlowCard>
        </View>
      ) : (
        <View style={styles.section}>
          <GlowCard glowColor={COLORS.border}>
            <View style={styles.lockState}>
              <Feather name="calendar" size={32} color={COLORS.textMuted} />
              <Text style={[styles.lockTitle, { fontFamily: FONTS.bodyBold }]}>
                Jour de repos
              </Text>
              <Text style={[styles.lockDesc, { fontFamily: FONTS.body }]}>
                Aucune séance prévue aujourd'hui. La récupération fait partie de l'entraînement.
              </Text>
            </View>
          </GlowCard>
        </View>
      )}

      {(historyQuery.data?.length ?? 0) > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            SÉANCES RÉCENTES
          </Text>
          {historyQuery.data?.slice(0, 5).map((log) => {
            const mode = log.variantMode as SessionMode;
            const c = MODE_CONFIG[mode] ?? MODE_CONFIG.normal;
            return (
              <View key={log.id} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: c.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyMode, { fontFamily: FONTS.bodyMedium, color: c.color }]}>
                    {c.label}
                  </Text>
                  <Text style={[styles.historyDate, { fontFamily: FONTS.mono }]}>
                    {log.completedAt != null
                      ? new Date(log.completedAt).toLocaleDateString("fr-FR")
                      : "En cours"}
                  </Text>
                </View>
                {log.rpe != null && (
                  <Text style={[styles.rpe, { fontFamily: FONTS.mono }]}>
                    RPE {log.rpe}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenTitle: {
    fontSize: 44,
    color: COLORS.white,
    letterSpacing: 5,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  lockState: { alignItems: "center", gap: 12, padding: 12 },
  lockTitle: { fontSize: 18, color: COLORS.white },
  lockDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  lockBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  lockBtnText: { fontSize: 15, color: COLORS.bg },
  sessionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: { fontSize: 12, color: COLORS.textSecondary },
  sessionName: { fontSize: 38, letterSpacing: 2, lineHeight: 42, marginBottom: 4 },
  exerciseCount: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  exercisePreview: { gap: 12, marginBottom: 24 },
  exRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exNum: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, minWidth: 24 },
  exName: { fontSize: 15, color: COLORS.white, marginBottom: 2 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary },
  moreEx: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  startBtnText: { fontSize: 15, letterSpacing: 1.5, color: COLORS.bg },
  historySection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 16 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyMode: { fontSize: 14 },
  historyDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  rpe: { fontSize: 13, color: COLORS.textSecondary },
});
