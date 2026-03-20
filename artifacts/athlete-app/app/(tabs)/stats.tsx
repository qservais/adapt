import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useGetCheckinHistory, useGetSessionHistory } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";

function ScoreChart({ data }: { data: { date: string; score: number; mode: string }[] }) {
  const max = Math.max(...data.map((d) => d.score), 1);
  const last30 = data.slice(-30);

  if (last30.length === 0) {
    return (
      <View style={chartStyles.empty}>
        <Text style={[chartStyles.emptyText, { fontFamily: FONTS.body }]}>
          No data yet
        </Text>
      </View>
    );
  }

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.yAxis}>
        {[100, 50, 0].map((v) => (
          <Text key={v} style={[chartStyles.yLabel, { fontFamily: FONTS.mono }]}>
            {v}
          </Text>
        ))}
      </View>
      <View style={chartStyles.bars}>
        {last30.map((d, i) => {
          const cfg = MODE_CONFIG[d.mode as SessionMode] ?? MODE_CONFIG.normal;
          const h = (d.score / 100) * 120;
          return (
            <View key={i} style={chartStyles.barWrap}>
              <View
                style={[
                  chartStyles.bar,
                  { height: h, backgroundColor: cfg.color },
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: "row", height: 140, alignItems: "flex-end" },
  empty: { height: 80, alignItems: "center", justifyContent: "center" },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  yAxis: {
    width: 28,
    height: 120,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 6,
  },
  yLabel: { fontSize: 9, color: COLORS.textMuted },
  bars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  barWrap: { flex: 1, height: 120, justifyContent: "flex-end" },
  bar: { borderRadius: 3, minHeight: 2 },
});

function CalendarStrip({ data }: { data: { date: string; mode: string }[] }) {
  const today = new Date();
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    const found = data.find((c) => c.date.startsWith(key));
    return { date: d, mode: found?.mode ?? null };
  });

  return (
    <View style={calStyles.grid}>
      {days.map((d, i) => {
        const cfg = d.mode ? MODE_CONFIG[d.mode as SessionMode] ?? null : null;
        const isToday = d.date.toDateString() === today.toDateString();
        return (
          <View
            key={i}
            style={[
              calStyles.cell,
              cfg && { backgroundColor: cfg.color },
              !cfg && { backgroundColor: COLORS.bgElevated },
              isToday && { borderWidth: 1, borderColor: COLORS.white },
            ]}
          />
        );
      })}
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  cell: {
    width: "5.5%",
    aspectRatio: 1,
    borderRadius: 3,
  },
});

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const checkinQuery = useGetCheckinHistory();
  const sessionQuery = useGetSessionHistory();

  const chartData = useMemo(
    () =>
      (checkinQuery.data ?? []).map((c) => ({
        date: c.date,
        score: c.adaptScore,
        mode: c.sessionMode,
      })),
    [checkinQuery.data]
  );

  const avgScore = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.round(chartData.reduce((a, b) => a + b.score, 0) / chartData.length);
  }, [chartData]);

  const sessionCount = sessionQuery.data?.length ?? 0;
  const avgRpe = useMemo(() => {
    const sessions = (sessionQuery.data ?? []).filter((s) => s.rpe);
    if (!sessions.length) return null;
    return (sessions.reduce((a, b) => a + (b.rpe ?? 0), 0) / sessions.length).toFixed(1);
  }, [sessionQuery.data]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: tabBarHeight + 24, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>STATS</Text>

      <View style={styles.statsRow}>
        <GlowCard glowColor={COLORS.green} style={styles.statCard}>
          <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
            {avgScore}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Avg Score</Text>
        </GlowCard>
        <GlowCard glowColor={COLORS.cyan} style={styles.statCard}>
          <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
            {sessionCount}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Sessions</Text>
        </GlowCard>
        <GlowCard glowColor={COLORS.amber} style={styles.statCard}>
          <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.amber }]}>
            {avgRpe ?? "—"}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Avg RPE</Text>
        </GlowCard>
      </View>

      <GlowCard glowColor={COLORS.green} style={styles.chartCard}>
        <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
          ADAPT SCORE — 30 JOURS
        </Text>
        <ScoreChart data={chartData} />
      </GlowCard>

      <GlowCard style={styles.calCard} glowColor={COLORS.border}>
        <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
          CALENDAR
        </Text>
        <View style={styles.legend}>
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.legendLabel, { fontFamily: FONTS.body }]}>
                {cfg.label}
              </Text>
            </View>
          ))}
        </View>
        <CalendarStrip data={chartData} />
      </GlowCard>

      <GlowCard style={styles.modeBreakdown} glowColor={COLORS.border}>
        <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
          MODE BREAKDOWN
        </Text>
        {Object.entries(MODE_CONFIG).map(([key, cfg]) => {
          const count = chartData.filter((d) => d.mode === key).length;
          const pct = chartData.length > 0 ? (count / chartData.length) * 100 : 0;
          return (
            <View key={key} style={styles.modeRow}>
              <Text style={[styles.modeLabel, { fontFamily: FONTS.body, color: cfg.color }]}>
                {cfg.label}
              </Text>
              <View style={styles.modeBar}>
                <View
                  style={[
                    styles.modeFill,
                    { width: `${pct}%`, backgroundColor: cfg.color },
                  ]}
                />
              </View>
              <Text style={[styles.modePct, { fontFamily: FONTS.mono }]}>
                {Math.round(pct)}%
              </Text>
            </View>
          );
        })}
      </GlowCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenTitle: {
    fontSize: 44,
    color: COLORS.white,
    letterSpacing: 5,
    marginBottom: 20,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: "center", gap: 4, padding: 16 },
  statVal: { fontSize: 30 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  chartCard: { marginBottom: 16, gap: 16 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  calCard: { marginBottom: 16, gap: 16 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: COLORS.textSecondary },
  modeBreakdown: { gap: 14 },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modeLabel: { width: 90, fontSize: 12 },
  modeBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  modeFill: { height: "100%", borderRadius: 3 },
  modePct: { fontSize: 11, color: COLORS.textMuted, width: 32, textAlign: "right" },
});
