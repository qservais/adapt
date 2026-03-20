import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import {
  useGetCheckinHistory,
  useGetSessionHistory,
} from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 120;

type Period = "7" | "14" | "30";

interface CheckinItem {
  date: string;
  adaptScore: number;
  sleep: number;
  energy: number;
  stress: number;
  soreness: number;
  motivation: number;
  sessionMode: string;
}

function ScoreBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={[barStyles.label, { fontFamily: FONTS.body }]}>{label}</Text>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[barStyles.val, { fontFamily: FONTS.mono }]}>
        {value.toFixed(1)}
      </Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 12, color: COLORS.textSecondary, width: 70 },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
  val: { fontSize: 12, color: COLORS.textMuted, width: 32, textAlign: "right" },
});

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return (
      <View
        style={{ height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13 }}>
          Not enough data
        </Text>
      </View>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = CHART_WIDTH / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((v - min) / range) * (CHART_HEIGHT - 16),
  }));

  return (
    <View style={{ height: CHART_HEIGHT + 16, paddingTop: 8 }}>
      <View
        style={{
          height: CHART_HEIGHT,
          backgroundColor: COLORS.bgElevated,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: (CHART_HEIGHT / 4) * i,
              height: 1,
              backgroundColor: COLORS.border,
            }}
          />
        ))}
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: cx - len / 2,
                top: cy - 1,
                width: len,
                height: 2,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
        {points.map((p, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
              borderWidth: 2,
              borderColor: COLORS.bg,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [period, setPeriod] = useState<Period>("14");

  const checkinQuery = useGetCheckinHistory();
  const sessionQuery = useGetSessionHistory();

  const days = parseInt(period);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const checkins: CheckinItem[] = ((checkinQuery.data ?? []) as CheckinItem[]).filter(
    (c) => new Date(c.date) >= cutoff
  );

  const sessions = (sessionQuery.data ?? []).filter(
    (s) => s.completedAt != null && new Date(s.completedAt) >= cutoff
  );

  const scores = checkins.map((c) => c.adaptScore);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const avg = (key: keyof Pick<CheckinItem, "sleep" | "energy" | "stress" | "soreness" | "motivation">) =>
    checkins.length > 0 ? checkins.reduce((a, c) => a + c[key], 0) / checkins.length : 0;

  const modeCounts: Record<string, number> = {};
  for (const c of checkins) {
    modeCounts[c.sessionMode] = (modeCounts[c.sessionMode] ?? 0) + 1;
  }

  const sortedScores = [...checkins]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((c) => c.adaptScore);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: tabBarHeight + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headRow}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>STATS</Text>
        <View style={styles.periodRow}>
          {(["7", "14", "30"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodBtn,
                period === p && styles.periodActive,
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  { fontFamily: FONTS.mono },
                  period === p && { color: COLORS.green },
                ]}
              >
                {p}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.kpiRow}>
          <GlowCard glowColor={COLORS.green} style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
              {avgScore.toFixed(0)}
            </Text>
            <Text style={[styles.kpiLabel, { fontFamily: FONTS.body }]}>Avg Score</Text>
          </GlowCard>
          <GlowCard glowColor={COLORS.cyan} style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
              {checkins.length}
            </Text>
            <Text style={[styles.kpiLabel, { fontFamily: FONTS.body }]}>Check-ins</Text>
          </GlowCard>
          <GlowCard glowColor={COLORS.violet} style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>
              {sessions.length}
            </Text>
            <Text style={[styles.kpiLabel, { fontFamily: FONTS.body }]}>Sessions</Text>
          </GlowCard>
        </View>
      </View>

      <View style={styles.section}>
        <GlowCard glowColor={COLORS.green} style={styles.chartCard}>
          <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>
            ADAPT SCORE TREND
          </Text>
          <MiniChart data={sortedScores} color={COLORS.green} />
        </GlowCard>
      </View>

      <View style={styles.section}>
        <GlowCard glowColor={COLORS.border} style={styles.averagesCard}>
          <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>
            DAILY AVERAGES
          </Text>
          <View style={styles.barList}>
            <ScoreBar value={avg("sleep")} max={5} color={COLORS.cyan} label="Sleep" />
            <ScoreBar value={avg("energy")} max={5} color={COLORS.green} label="Energy" />
            <ScoreBar value={avg("stress")} max={5} color={COLORS.amber} label="Stress" />
            <ScoreBar value={avg("soreness")} max={5} color={COLORS.red} label="Soreness" />
            <ScoreBar value={avg("motivation")} max={5} color={COLORS.violet} label="Motivation" />
          </View>
        </GlowCard>
      </View>

      {Object.keys(modeCounts).length > 0 && (
        <View style={styles.section}>
          <GlowCard glowColor={COLORS.border} style={styles.modesCard}>
            <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>
              SESSION DISTRIBUTION
            </Text>
            <View style={styles.modesList}>
              {Object.entries(modeCounts).map(([mode, count]) => {
                const cfg = MODE_CONFIG[mode as SessionMode] ?? MODE_CONFIG.normal;
                const pct = checkins.length > 0 ? (count / checkins.length) * 100 : 0;
                return (
                  <View key={mode} style={styles.modeRow}>
                    <View style={[styles.modeDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.modeLabel, { fontFamily: FONTS.bodyMedium, color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                    <View style={styles.modeBar}>
                      <View
                        style={[
                          styles.modeBarFill,
                          { width: `${pct}%`, backgroundColor: cfg.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.modeCount, { fontFamily: FONTS.mono }]}>
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlowCard>
        </View>
      )}

      {sessions.length > 0 && (
        <View style={styles.section}>
          <GlowCard glowColor={COLORS.border}>
            <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>
              RECENT SESSIONS
            </Text>
            <View style={styles.sessionList}>
              {sessions.slice(0, 5).map((s) => {
                const mode = s.variantMode as SessionMode;
                const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.normal;
                return (
                  <View key={s.id} style={styles.sessionRow}>
                    <View style={[styles.modeDot, { backgroundColor: cfg.color }]} />
                    <Text style={[styles.sessionDate, { fontFamily: FONTS.mono }]}>
                      {s.completedAt != null
                        ? new Date(s.completedAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </Text>
                    <Text style={[styles.sessionMode, { fontFamily: FONTS.bodyMedium, color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                    {s.rpe != null && (
                      <View style={styles.rpePill}>
                        <Text style={[styles.rpeText, { fontFamily: FONTS.mono }]}>
                          RPE {s.rpe}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </GlowCard>
        </View>
      )}

      {checkins.length === 0 && (
        <View style={styles.emptyWrap}>
          <Feather name="bar-chart-2" size={40} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            No data for this period. Start checking in daily!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  screenTitle: { fontSize: 44, color: COLORS.white, letterSpacing: 5 },
  periodRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  periodActive: { backgroundColor: COLORS.greenDim },
  periodText: { fontSize: 12, color: COLORS.textSecondary },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: { flex: 1, alignItems: "center", padding: 16 },
  kpiVal: { fontSize: 32, marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary },
  chartCard: { gap: 12 },
  averagesCard: { gap: 16 },
  modesCard: { gap: 14 },
  cardTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
  barList: { gap: 12 },
  modesList: { gap: 10 },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  modeLabel: { fontSize: 13, width: 80 },
  modeBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  modeBarFill: { height: "100%", borderRadius: 3 },
  modeCount: { fontSize: 12, color: COLORS.textMuted, minWidth: 20, textAlign: "right" },
  sessionList: { gap: 2 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionDate: { fontSize: 11, color: COLORS.textMuted, width: 60 },
  sessionMode: { flex: 1, fontSize: 14 },
  rpePill: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rpeText: { fontSize: 11, color: COLORS.textSecondary },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 16, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
});
