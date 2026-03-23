import React, { useRef } from "react";
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
import { useScrollToTop } from "@react-navigation/native";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GlowCard } from "@/components/ui/GlowCard";

const CATEGORY_FR: Record<string, string> = {
  compound: "POLYARTICULAIRE",
  isolation: "ISOLATION",
  cardio: "CARDIO",
  mobility: "MOBILITÉ",
  plyometric: "PLIOMÉTRIQUE",
  strength: "FORCE",
  warmup: "ÉCHAUFFEMENT",
  cool_down: "RÉCUPÉRATION",
};

function groupByCategory<T extends { category?: string | null }>(
  items: T[]
): { category: string; exercises: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category ?? "general";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return Array.from(map.entries()).map(([category, exercises]) => ({ category, exercises }));
}

export default function SessionTab() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const checkinQuery = useGetTodayCheckin();
  const sessionQuery = useGetTodaySession();
  const historyQuery = useGetSessionHistory();

  const hasCheckin = checkinQuery.data != null;
  const session = sessionQuery.data;
  const modeKey = (checkinQuery.data?.sessionMode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const exercises = session?.exercises ?? [];
  const grouped = groupByCategory(exercises);

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 24 }}
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
              {exercises.length} exercice{exercises.length !== 1 ? "s" : ""}
            </Text>

            {/* Exercises grouped by category */}
            <View style={styles.exerciseList}>
              {grouped.map(({ category, exercises: exs }, gi) => (
                <View key={category} style={gi > 0 ? styles.groupBlock : undefined}>
                  {/* Category header — only show if there's more than one group */}
                  {grouped.length > 1 && (
                    <Text style={[styles.groupHeader, { fontFamily: FONTS.mono }]}>
                      {CATEGORY_FR[category] ?? category.toUpperCase()}
                    </Text>
                  )}
                  {exs.map((ex, i) => {
                    const globalIndex = exercises.indexOf(ex);
                    return (
                      <View key={ex.id} style={[styles.exRow, i === exs.length - 1 && styles.exRowLast]}>
                        <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                          {String(globalIndex + 1).padStart(2, "0")}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>
                            {ex.exerciseName}
                          </Text>
                          <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                            {ex.sets}×{ex.reps}
                            {ex.adaptedLoadKg != null ? ` @ ${ex.adaptedLoadKg} kg` : ""}
                          </Text>
                          <Text style={[styles.exRest, { fontFamily: FONTS.mono }]}>
                            {(ex.restSeconds ?? 0) > 0
                              ? `Repos : ${ex.restSeconds}s`
                              : "Enchaîner"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => exercises.length > 0 ? router.push("/session") : undefined}
              style={[
                styles.startBtn,
                { backgroundColor: cfg.color },
                exercises.length === 0 && { backgroundColor: COLORS.border, opacity: 0.5 },
              ]}
              disabled={exercises.length === 0}
            >
              <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>
                {exercises.length === 0 ? "AUCUN EXERCICE" : "DÉMARRER LA SÉANCE"}
              </Text>
              {exercises.length > 0 && <Feather name="arrow-right" size={18} color={COLORS.bg} />}
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

      {(historyQuery.data?.filter((l) => l.completedAt != null).length ?? 0) > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            SÉANCES RÉCENTES
          </Text>
          {historyQuery.data?.filter((l) => l.completedAt != null).map((log) => {
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
  exerciseCount: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  exerciseList: { gap: 0, marginBottom: 24 },
  groupBlock: { marginTop: 12 },
  groupHeader: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 4,
  },
  exRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exRowLast: {
    borderBottomWidth: 0,
  },
  exNum: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, minWidth: 24 },
  exName: { fontSize: 15, color: COLORS.white, marginBottom: 2 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 1 },
  exRest: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
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
