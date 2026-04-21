import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NutritionTab } from "@/components/nutrition/NutritionTab";
import { BodyTab } from "@/components/stats/BodyTab";
import { StepsSection } from "@/components/steps/StepsSection";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetCheckinHistory,
  useGetSessionHistory,
  useGetPersonalRecords,
  useGetAthleteTests,
  useGetExerciseLoadHistory,
  useGetWeeklyVolume,
  useGetWeekComparison,
} from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { useThemeColors, useFormatWeight } from "@/context/PreferencesContext";
import { useScrollToTop } from "@react-navigation/native";
import { GlowCard } from "@/components/ui/GlowCard";
import type { ExerciseLoadHistory } from "@workspace/api-client-react";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 110;

type Period = "7" | "14" | "30";
type ActiveTab = "training" | "nutrition" | "body";

const DEFAULT_SECTION_ORDER = [
  "kpi", "weekComparison", "tests", "steps", "trend", "calendar",
  "weeklyVolume", "exerciseLoad", "averages", "weekly", "modes", "rpe", "prs",
];

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

interface SessionLogItem {
  id: string;
  variantMode: string;
  completedAt?: string | null;
  rpe?: number | null;
  perceivedDifficulty?: string | null;
}

function ScoreBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={[barStyles.label, { fontFamily: FONTS.body }]}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[barStyles.val, { fontFamily: FONTS.mono }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 12, color: COLORS.textSecondary, width: 70 },
  track: { flex: 1, height: 8, backgroundColor: COLORS.bgElevated, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  val: { fontSize: 12, color: COLORS.textMuted, width: 32, textAlign: "right" },
});

function ScoreTrendChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13 }}>
          Pas encore assez de données
        </Text>
      </View>
    );
  }
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const stepX = CHART_WIDTH / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((v - minV) / range) * (CHART_HEIGHT - 16) - 8,
  }));
  return (
    <View style={{ height: CHART_HEIGHT + 24 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>{data[0]}</Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>{data[data.length - 1]}</Text>
      </View>
      <View style={{ height: CHART_HEIGHT, backgroundColor: COLORS.bgElevated, borderRadius: 8, overflow: "hidden", position: "relative" }}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <View key={pct} style={{ position: "absolute", left: 0, right: 0, top: CHART_HEIGHT * (1 - pct / 100) - 0.5, height: 1, backgroundColor: COLORS.border, opacity: 0.5 }} />
        ))}
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1]!;
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View key={i} style={{ position: "absolute", left: cx - len / 2, top: cy - 1.5, width: len, height: 3, backgroundColor: color, transform: [{ rotate: `${angle}deg` }], borderRadius: 2 }} />
          );
        })}
        {points.map((p, i) => (
          <View key={i} style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: 2, borderColor: COLORS.bg }} />
        ))}
      </View>
    </View>
  );
}

function MonthCalendar({ checkins, year, month }: { checkins: CheckinItem[]; year: number; month: number }) {
  const jsFirstDay = new Date(year, month, 1).getDay();
  const firstDay = (jsFirstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const checkinByDay: Record<number, CheckinItem> = {};
  for (const c of checkins) {
    const d = new Date(c.date);
    if (d.getFullYear() === year && d.getMonth() === month) checkinByDay[d.getDate()] = c;
  }
  const monthName = new Date(year, month).toLocaleString("fr-FR", { month: "long" });
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <View>
      <Text style={[styles.calMonthTitle, { fontFamily: FONTS.mono }]}>{monthName.toUpperCase()} {year}</Text>
      <View style={styles.calDayRow}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <Text key={i} style={[styles.calDayLabel, { fontFamily: FONTS.mono }]}>{d}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calRow}>
          {row.map((day, di) => {
            if (day == null) return <View key={di} style={styles.calCell} />;
            const checkin = checkinByDay[day];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const modeColor = checkin ? (MODE_CONFIG[checkin.sessionMode as SessionMode]?.color ?? COLORS.border) : null;
            return (
              <View key={di} style={[styles.calCell, checkin != null && { backgroundColor: `${modeColor}30`, borderColor: modeColor ?? COLORS.border, borderWidth: 1 }, isToday && styles.calToday]}>
                <Text style={[styles.calDayNum, { fontFamily: checkin ? FONTS.monoBold : FONTS.mono }, checkin != null && { color: modeColor ?? COLORS.white }, isToday && !checkin && { color: COLORS.green }]}>
                  {day}
                </Text>
                {checkin != null && <View style={[styles.calDot, { backgroundColor: modeColor ?? COLORS.border }]} />}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function WeeklyVolumeBarChart({ weeks }: { weeks: Array<{ weekStart: string; volume: number; sessions: number }> }) {
  if (weeks.length === 0) return null;
  const nonZero = weeks.filter(w => w.volume > 0);
  if (nonZero.length === 0) {
    return (
      <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13 }}>Pas encore assez de données</Text>
      </View>
    );
  }
  const maxVol = Math.max(...weeks.map(w => w.volume), 1);
  const BAR_H = 80;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_H, gap: 4 }}>
        {weeks.map((w, i) => {
          const pct = w.volume / maxVol;
          const barH = Math.max(pct * BAR_H, w.volume > 0 ? 4 : 0);
          const isCurrentWeek = i === weeks.length - 1;
          return (
            <View key={w.weekStart} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: BAR_H }}>
              <View style={{ width: "80%", height: barH, backgroundColor: isCurrentWeek ? COLORS.green : `${COLORS.green}60`, borderRadius: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
        {weeks.map((w, i) => {
          const label = w.weekStart.slice(5).replace("-", "/");
          const isCurrentWeek = i === weeks.length - 1;
          return (
            <View key={w.weekStart} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 9, color: isCurrentWeek ? COLORS.green : COLORS.textMuted }} numberOfLines={1}>{label}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted }}>
          Total semaine actuelle : <Text style={{ fontFamily: FONTS.monoBold, color: COLORS.green }}>{(weeks[weeks.length - 1]?.volume ?? 0).toLocaleString()} kg·reps</Text>
        </Text>
      </View>
    </View>
  );
}

function ExerciseLoadSection({ exercises }: { exercises: ExerciseLoadHistory[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const formatWeight = useFormatWeight();

  if (exercises.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 24 }}>
        <Text style={{ fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13, textAlign: "center" }}>
          Aucune donnée de charge.{"\n"}Enregistre tes séances pour voir ta progression !
        </Text>
      </View>
    );
  }

  const exercise = exercises[selectedIdx] ?? exercises[0]!;
  const points = exercise.points;
  const values = points.map(p => p.loadKg);

  const trend = values.length >= 2
    ? values[values.length - 1]! - values[0]!
    : null;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const stepX = values.length > 1 ? CHART_WIDTH / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((v - minV) / range) * (CHART_HEIGHT - 16) - 8,
  }));

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
          {exercises.slice(0, 12).map((ex, i) => (
            <TouchableOpacity
              key={ex.exerciseId}
              onPress={() => setSelectedIdx(i)}
              style={[exStyles.chip, selectedIdx === i && exStyles.chipActive]}
            >
              <Text style={[exStyles.chipText, { fontFamily: FONTS.mono, color: selectedIdx === i ? COLORS.cyan : COLORS.textSecondary }]} numberOfLines={1}>
                {ex.exerciseName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ fontFamily: FONTS.monoBold, fontSize: 28, color: COLORS.cyan }}>
          {formatWeight(values[values.length - 1] ?? 0)}
        </Text>
        {trend != null && (
          <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: trend >= 0 ? COLORS.green : COLORS.amber }}>
            {trend >= 0 ? "↑ +" : "↓ "}{formatWeight(Math.abs(trend))}
          </Text>
        )}
      </View>

      {values.length >= 2 ? (
        <View style={{ height: CHART_HEIGHT, backgroundColor: COLORS.bgElevated, borderRadius: 8, overflow: "hidden", position: "relative" }}>
          {[0, 25, 50, 75, 100].map((pct) => (
            <View key={pct} style={{ position: "absolute", left: 0, right: 0, top: CHART_HEIGHT * (1 - pct / 100) - 0.5, height: 1, backgroundColor: COLORS.border, opacity: 0.4 }} />
          ))}
          {pts.map((p, i) => {
            if (i === 0) return null;
            const prev = pts[i - 1]!;
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const cx = (prev.x + p.x) / 2;
            const cy = (prev.y + p.y) / 2;
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View key={i} style={{ position: "absolute", left: cx - len / 2, top: cy - 1.5, width: len, height: 3, backgroundColor: COLORS.cyan, transform: [{ rotate: `${angle}deg` }], borderRadius: 2 }} />
            );
          })}
          {pts.map((p, i) => (
            <View key={i} style={{ position: "absolute", left: p.x - 4, top: p.y - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.cyan, borderWidth: 2, borderColor: COLORS.bg }} />
          ))}
        </View>
      ) : (
        <View style={{ height: 60, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13 }}>Une seule séance enregistrée pour cet exercice</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>{points[0]?.date.slice(5)}</Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>{points[points.length - 1]?.date.slice(5)}</Text>
      </View>
    </View>
  );
}

const exStyles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.cyanDim, borderColor: COLORS.cyan },
  chipText: { fontSize: 11, letterSpacing: 0.5, maxWidth: 130 },
});

function WeekComparisonSection({ thisWeek, lastWeek }: {
  thisWeek: { sessions: number; avgRpe: number | null; totalDurationMin: number };
  lastWeek: { sessions: number; avgRpe: number | null; totalDurationMin: number };
}) {
  function delta(current: number, previous: number) {
    const d = current - previous;
    if (d === 0) return null;
    return { value: Math.abs(d), positive: d > 0 };
  }

  const sessionsDelta = delta(thisWeek.sessions, lastWeek.sessions);
  const durationDelta = delta(thisWeek.totalDurationMin, lastWeek.totalDurationMin);

  return (
    <View style={wcStyles.grid}>
      <View style={wcStyles.col}>
        <Text style={[wcStyles.colLabel, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>CETTE SEMAINE</Text>
        <View style={wcStyles.statItem}>
          <Text style={[wcStyles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>{thisWeek.sessions}</Text>
          <Text style={[wcStyles.statLabel, { fontFamily: FONTS.body }]}>Séances</Text>
        </View>
        <View style={wcStyles.statItem}>
          <Text style={[wcStyles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
            {thisWeek.avgRpe != null ? thisWeek.avgRpe.toFixed(1) : "—"}
          </Text>
          <Text style={[wcStyles.statLabel, { fontFamily: FONTS.body }]}>RPE moy.</Text>
        </View>
        <View style={wcStyles.statItem}>
          <Text style={[wcStyles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
            {thisWeek.totalDurationMin > 0 ? `${thisWeek.totalDurationMin}min` : "—"}
          </Text>
          <Text style={[wcStyles.statLabel, { fontFamily: FONTS.body }]}>Durée</Text>
        </View>
      </View>

      <View style={wcStyles.divider} />

      <View style={wcStyles.col}>
        <Text style={[wcStyles.colLabel, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>SEMAINE PRÉC.</Text>
        <View style={wcStyles.statItem}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={[wcStyles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.textSecondary }]}>{lastWeek.sessions}</Text>
            {sessionsDelta && (
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: sessionsDelta.positive ? COLORS.green : COLORS.amber }}>
                {sessionsDelta.positive ? "+" : "-"}{sessionsDelta.value}
              </Text>
            )}
          </View>
          <Text style={[wcStyles.statLabel, { fontFamily: FONTS.body }]}>Séances</Text>
        </View>
        <View style={wcStyles.statItem}>
          <Text style={[wcStyles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.textSecondary }]}>
            {lastWeek.avgRpe != null ? lastWeek.avgRpe.toFixed(1) : "—"}
          </Text>
          <Text style={[wcStyles.statLabel, { fontFamily: FONTS.body }]}>RPE moy.</Text>
        </View>
        <View style={wcStyles.statItem}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={[wcStyles.statVal, { fontFamily: FONTS.monoBold, color: COLORS.textSecondary }]}>
              {lastWeek.totalDurationMin > 0 ? `${lastWeek.totalDurationMin}min` : "—"}
            </Text>
            {durationDelta && (
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: durationDelta.positive ? COLORS.green : COLORS.amber }}>
                {durationDelta.positive ? "+" : "-"}{durationDelta.value}min
              </Text>
            )}
          </View>
          <Text style={[wcStyles.statLabel, { fontFamily: FONTS.body }]}>Durée</Text>
        </View>
      </View>
    </View>
  );
}

const wcStyles = StyleSheet.create({
  grid: { flexDirection: "row" },
  col: { flex: 1, gap: 12 },
  divider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  colLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  statItem: { gap: 2 },
  statVal: { fontSize: 22 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
});

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const formatWeight = useFormatWeight();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const [activeTab, setActiveTab] = useState<ActiveTab>("training");
  const [period, setPeriod] = useState<Period>("30");
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const checkinQuery = useGetCheckinHistory();
  const sessionQuery = useGetSessionHistory();
  const prQuery = useGetPersonalRecords();
  const testsQuery = useGetAthleteTests();
  const loadHistoryQuery = useGetExerciseLoadHistory(30);
  const weeklyVolumeQuery = useGetWeeklyVolume(8);
  const weekComparisonQuery = useGetWeekComparison();

  const days = parseInt(period);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const allCheckins = (checkinQuery.data ?? []) as CheckinItem[];
  const checkins = allCheckins.filter((c) => new Date(c.date) >= cutoff);
  const allSessions = (sessionQuery.data ?? []) as SessionLogItem[];
  const sessions = allSessions.filter((s) => s.completedAt != null && new Date(s.completedAt) >= cutoff);
  const scores = checkins.map((c) => c.adaptScore);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const avg = (key: keyof Pick<CheckinItem, "sleep" | "energy" | "stress" | "soreness" | "motivation">) =>
    checkins.length > 0 ? checkins.reduce((a, c) => a + c[key], 0) / checkins.length : 0;
  const avgRpe =
    sessions.filter((s) => s.rpe != null).length > 0
      ? sessions.filter((s) => s.rpe != null).reduce((a, s) => a + (s.rpe ?? 0), 0) / sessions.filter((s) => s.rpe != null).length
      : 0;
  const modeCounts: Record<string, number> = {};
  for (const c of checkins) modeCounts[c.sessionMode] = (modeCounts[c.sessionMode] ?? 0) + 1;
  const sortedScores = [...checkins].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((c) => c.adaptScore);
  const sortedRpe = [...sessions].filter((s) => s.rpe != null && s.completedAt != null).sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()).map((s) => s.rpe as number);

  const prevMonth = () => setCalMonth((prev) => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  const nextMonth = () => setCalMonth((prev) => {
    const now = new Date();
    if (prev.year === now.getFullYear() && prev.month === now.getMonth()) return prev;
    return prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 };
  });

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const exerciseLoadData = loadHistoryQuery.data?.exercises ?? [];
  const weeklyVolumeData = weeklyVolumeQuery.data?.weeks ?? [];
  const weekComparisonData = weekComparisonQuery.data;

  const sectionContentMap: Record<string, React.ReactNode> = {
    kpi: (
      <View style={styles.kpiRow}>
        <GlowCard glowColor={COLORS.cyan} style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>{avgScore.toFixed(0)}</Text>
          <Text style={[styles.kpiLabel, { fontFamily: FONTS.body }]}>Moy. Score</Text>
        </GlowCard>
        <GlowCard glowColor={COLORS.cyan} style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>{checkins.length}</Text>
          <Text style={[styles.kpiLabel, { fontFamily: FONTS.body }]}>Check-ins</Text>
        </GlowCard>
        <GlowCard glowColor={COLORS.violet} style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>{sessions.length}</Text>
          <Text style={[styles.kpiLabel, { fontFamily: FONTS.body }]}>Séances</Text>
        </GlowCard>
      </View>
    ),
    weekComparison: weekComparisonData ? (
      <GlowCard glowColor={COLORS.cyan} style={styles.chartCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>SEMAINE N VS N-1</Text>
        <WeekComparisonSection thisWeek={weekComparisonData.thisWeek} lastWeek={weekComparisonData.lastWeek} />
      </GlowCard>
    ) : null,
    tests: (testsQuery.data?.length ?? 0) > 0 ? (
      <GlowCard glowColor={COLORS.violet} style={styles.testsCard}>
        <View style={styles.testsHeader}>
          <Feather name="activity" size={14} color={COLORS.violet} />
          <Text style={[styles.cardTitle, { fontFamily: FONTS.mono, color: COLORS.violet }]}>MES TESTS</Text>
        </View>
        {testsQuery.data!.slice(0, 8).map((test, i) => {
          const label = test.exerciseName ?? test.testType;
          const prevTest = testsQuery.data!.slice(i + 1).find((t) => (t.exerciseName ?? t.testType) === label);
          const delta = prevTest != null ? test.value - prevTest.value : null;
          return (
            <View key={test.id} style={[styles.testRow, i === 0 && styles.testRowFirst]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.testName, { fontFamily: FONTS.body }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.testDate, { fontFamily: FONTS.mono }]}>{new Date(test.testedAt).toLocaleDateString("fr-FR")}</Text>
              </View>
              <View style={styles.testRight}>
                {delta != null && (
                  <Text style={[styles.testDelta, { fontFamily: FONTS.mono, color: delta >= 0 ? COLORS.green : COLORS.red }]}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                  </Text>
                )}
                <Text style={[styles.testVal, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>{test.value} {test.unit}</Text>
              </View>
            </View>
          );
        })}
      </GlowCard>
    ) : null,
    steps: <StepsSection />,
    trend: (
      <GlowCard glowColor={COLORS.cyan} style={styles.chartCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>ÉVOLUTION ADAPT SCORE</Text>
        <ScoreTrendChart data={sortedScores} color={COLORS.cyan} />
      </GlowCard>
    ),
    calendar: (
      <GlowCard glowColor={COLORS.border} style={styles.calCard}>
        <View style={styles.calHeader}>
          <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>CALENDRIER</Text>
          <View style={styles.calNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
              <Feather name="chevron-left" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
              <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <MonthCalendar checkins={allCheckins} year={calMonth.year} month={calMonth.month} />
        <View style={styles.calLegend}>
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <View key={key} style={styles.calLegendItem}>
              <View style={[styles.calLegendDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.calLegendText, { fontFamily: FONTS.mono, color: cfg.color }]}>{cfg.label}</Text>
            </View>
          ))}
        </View>
      </GlowCard>
    ),
    weeklyVolume: (
      <GlowCard glowColor={COLORS.green} style={styles.chartCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>VOLUME HEBDOMADAIRE</Text>
        <WeeklyVolumeBarChart weeks={weeklyVolumeData} />
      </GlowCard>
    ),
    exerciseLoad: exerciseLoadData.length > 0 ? (
      <GlowCard glowColor={COLORS.cyan} style={styles.chartCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>PROGRESSION DES CHARGES (30J)</Text>
        <ExerciseLoadSection exercises={exerciseLoadData} />
      </GlowCard>
    ) : null,
    averages: (
      <GlowCard glowColor={COLORS.border} style={styles.averagesCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>MOYENNES QUOTIDIENNES</Text>
        <View style={styles.barList}>
          <ScoreBar value={avg("sleep")} max={5} color={COLORS.cyan} label="Sommeil" />
          <ScoreBar value={avg("energy")} max={5} color={COLORS.green} label="Énergie" />
          <ScoreBar value={avg("stress")} max={5} color={COLORS.amber} label="Stress" />
          <ScoreBar value={avg("soreness")} max={5} color={COLORS.red} label="Courbat." />
          <ScoreBar value={avg("motivation")} max={5} color={COLORS.violet} label="Motivat." />
        </View>
      </GlowCard>
    ),
    weekly: (
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/weekly-recap")}>
        <GlowCard glowColor={COLORS.amber} style={styles.weeklyCard}>
          <View style={styles.weeklyCardHeader}>
            <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>BILAN HEBDOMADAIRE</Text>
            <Feather name="chevron-right" size={16} color={COLORS.amber} />
          </View>
          <View style={styles.weeklyRow}>
            <View style={styles.weeklyItem}>
              <Text style={[styles.weeklyVal, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>
                {sessions.filter((s) => { const d = new Date(s.completedAt ?? ""); const w = new Date(); w.setDate(w.getDate() - 7); return d >= w; }).length}
              </Text>
              <Text style={[styles.weeklyLabel, { fontFamily: FONTS.body }]}>Séances</Text>
            </View>
            <View style={styles.weeklyDivider} />
            <View style={styles.weeklyItem}>
              <Text style={[styles.weeklyVal, { fontFamily: FONTS.monoBold, color: COLORS.amber }]}>{avgRpe > 0 ? avgRpe.toFixed(1) : "—"}</Text>
              <Text style={[styles.weeklyLabel, { fontFamily: FONTS.body }]}>RPE moy.</Text>
            </View>
            <View style={styles.weeklyDivider} />
            <View style={styles.weeklyItem}>
              <Text style={[styles.weeklyVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>{avgScore.toFixed(0)}</Text>
              <Text style={[styles.weeklyLabel, { fontFamily: FONTS.body }]}>Score moy.</Text>
            </View>
          </View>
        </GlowCard>
      </TouchableOpacity>
    ),
    modes: Object.keys(modeCounts).length > 0 ? (
      <GlowCard glowColor={COLORS.border} style={styles.modesCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>RÉPARTITION DES SÉANCES</Text>
        <View style={styles.modesList}>
          {Object.entries(modeCounts).map(([mode, count]) => {
            const cfg = MODE_CONFIG[mode as SessionMode] ?? MODE_CONFIG.normal;
            const pct = checkins.length > 0 ? (count / checkins.length) * 100 : 0;
            return (
              <View key={mode} style={styles.modeRow}>
                <View style={[styles.modeDot, { backgroundColor: cfg.color }]} />
                <Text style={[styles.modeLabel, { fontFamily: FONTS.bodyMedium, color: cfg.color }]} numberOfLines={1}>{cfg.label}</Text>
                <View style={styles.modeBar}>
                  <View style={[styles.modeBarFill, { width: `${pct}%`, backgroundColor: cfg.color }]} />
                </View>
                <Text style={[styles.modeCount, { fontFamily: FONTS.mono }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      </GlowCard>
    ) : null,
    rpe: sortedRpe.length >= 2 ? (
      <GlowCard glowColor={COLORS.amber} style={styles.chartCard}>
        <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>PROGRESSION D&apos;EFFORT (RPE)</Text>
        <ScoreTrendChart data={sortedRpe} color={COLORS.amber} />
        <View style={styles.rpeScaleRow}>
          {([
            [COLORS.cyan, "1-4 Facile"],
            [COLORS.green, "5-7 Modéré"],
            [COLORS.amber, "8-9 Difficile"],
            [COLORS.red, "10 Max"],
          ] as [string, string][]).map(([color, label]) => (
            <View key={label} style={styles.rpeScaleItem}>
              <View style={[styles.rpeScaleDot, { backgroundColor: color }]} />
              <Text style={[styles.rpeScaleLabel, { fontFamily: FONTS.mono }]}>{label}</Text>
            </View>
          ))}
        </View>
      </GlowCard>
    ) : null,
    prs: (prQuery.data?.personalRecords?.length ?? 0) > 0 ? (
      <GlowCard glowColor={COLORS.cyan} style={styles.prCard}>
        <View style={styles.prCardHeader}>
          <Feather name="trending-up" size={14} color={COLORS.cyan} />
          <Text style={[styles.cardTitle, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>MES RECORDS PERSONNELS</Text>
        </View>
        {(prQuery.data?.personalRecords ?? []).slice(0, 8).map((pr) => (
          <View key={pr.exerciseId} style={styles.prItemRow}>
            <Text style={[styles.prItemName, { fontFamily: FONTS.body }]} numberOfLines={1}>{pr.exerciseName}</Text>
            <View style={styles.prItemRight}>
              {pr.isRecent && (
                <View style={styles.prNewBadge}>
                  <Text style={[{ fontSize: 9, color: COLORS.cyan, fontFamily: FONTS.mono }]}>NEW</Text>
                </View>
              )}
              <Text style={[styles.prItemLoad, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>{formatWeight(pr.loadKg)}</Text>
            </View>
          </View>
        ))}
        {(prQuery.data?.total ?? 0) > 8 && (
          <Text style={[{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, textAlign: "center", marginTop: 4 }]}>
            +{(prQuery.data?.total ?? 0) - 8} autres records
          </Text>
        )}
      </GlowCard>
    ) : null,
  };

  const visibleSections = DEFAULT_SECTION_ORDER
    .filter((id) => sectionContentMap[id] != null);

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingTop: topPad + (Platform.OS === "web" ? 16 : 52), paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headRow}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>STATS</Text>
        {activeTab === "training" && (
          <View style={styles.periodRow}>
            {(["7", "14", "30"] as Period[]).map((p) => (
              <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.periodBtn, period === p && styles.periodActive]}>
                <Text style={[styles.periodText, { fontFamily: FONTS.mono }, period === p && { color: COLORS.cyan }]}>{p}j</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setActiveTab("training")} style={[styles.tabBtn, activeTab === "training" && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, { fontFamily: FONTS.mono, color: activeTab === "training" ? COLORS.cyan : COLORS.textMuted }]}>ENTRAÎN.</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("nutrition")} style={[styles.tabBtn, activeTab === "nutrition" && styles.tabBtnActiveGreen]}>
          <Text style={[styles.tabBtnText, { fontFamily: FONTS.mono, color: activeTab === "nutrition" ? COLORS.green : COLORS.textMuted }]}>NUTRITION</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab("body")} style={[styles.tabBtn, activeTab === "body" && styles.tabBtnActiveViolet]}>
          <Text style={[styles.tabBtnText, { fontFamily: FONTS.mono, color: activeTab === "body" ? COLORS.violet : COLORS.textMuted }]}>MON CORPS</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "nutrition" && <NutritionTab />}

      {activeTab === "body" && <BodyTab />}

      {activeTab === "training" && (
        <>
          <View style={styles.sectionsWrapper}>
            {visibleSections.map((id) => {
              const content = sectionContentMap[id];
              if (!content) return null;
              return (
                <View key={id} style={styles.section}>
                  {content}
                </View>
              );
            })}
          </View>

          {checkins.length === 0 && (
            <View style={styles.emptyWrap}>
              <Feather name="bar-chart-2" size={40} color={COLORS.textMuted} />
              <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                Aucune donnée pour cette période. Commence ton check-in quotidien !
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  screenTitle: { fontSize: 44, color: COLORS.white, letterSpacing: 5 },
  periodRow: { flexDirection: "row", backgroundColor: COLORS.bgCard, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  periodActive: { backgroundColor: COLORS.cyanDim },
  periodText: { fontSize: 12, color: COLORS.textSecondary },
  tabRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 20, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.cyan },
  tabBtnActiveGreen: { borderBottomWidth: 2, borderBottomColor: COLORS.green },
  tabBtnActiveViolet: { borderBottomWidth: 2, borderBottomColor: COLORS.violet },
  tabBtnText: { fontSize: 11, letterSpacing: 1 },
  sectionsWrapper: { paddingHorizontal: 20 },
  section: { marginBottom: 16 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: { flex: 1, alignItems: "center", padding: 16 },
  kpiVal: { fontSize: 32, marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary },
  weeklyCard: { gap: 16 },
  weeklyRow: { flexDirection: "row", backgroundColor: COLORS.bgElevated, borderRadius: 12, overflow: "hidden" },
  weeklyItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 4 },
  weeklyDivider: { width: 1, backgroundColor: COLORS.border },
  weeklyVal: { fontSize: 26 },
  weeklyLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: "center" },
  chartCard: { gap: 12 },
  averagesCard: { gap: 16 },
  modesCard: { gap: 14 },
  calCard: { gap: 16 },
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calNav: { flexDirection: "row", gap: 4 },
  calNavBtn: { padding: 6 },
  calMonthTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 12 },
  calDayRow: { flexDirection: "row", marginBottom: 6 },
  calDayLabel: { flex: 1, fontSize: 10, color: COLORS.textMuted, textAlign: "center", letterSpacing: 0.5 },
  calRow: { flexDirection: "row", marginBottom: 4 },
  calCell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 1, borderColor: "transparent", marginHorizontal: 1.5, gap: 2, padding: 2 },
  calToday: { borderColor: COLORS.cyan, borderWidth: 1.5 },
  calDayNum: { fontSize: 11, color: COLORS.textMuted },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  calLegendDot: { width: 8, height: 8, borderRadius: 4 },
  calLegendText: { fontSize: 10, letterSpacing: 1 },
  rpeScaleRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10, flexWrap: "wrap", gap: 6 },
  rpeScaleItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  rpeScaleDot: { width: 8, height: 8, borderRadius: 4 },
  rpeScaleLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.5 },
  weeklyCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prCard: { gap: 8 },
  prCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  prItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  prItemName: { fontSize: 13, color: COLORS.textSecondary, flex: 1, marginRight: 12 },
  prItemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  prItemLoad: { fontSize: 14 },
  prNewBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: COLORS.cyanDim, borderRadius: 4, borderWidth: 1, borderColor: COLORS.cyan },
  cardTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  barList: { gap: 12 },
  modesList: { gap: 10 },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  modeLabel: { fontSize: 13, width: 86, flexShrink: 1 },
  modeBar: { flex: 1, height: 6, backgroundColor: COLORS.bgElevated, borderRadius: 3, overflow: "hidden" },
  modeBarFill: { height: "100%", borderRadius: 3 },
  modeCount: { fontSize: 12, color: COLORS.textMuted, minWidth: 20, textAlign: "right" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 16, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  testsCard: { gap: 0 },
  testsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  testRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  testRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  testName: { fontSize: 14, color: COLORS.white, marginBottom: 2 },
  testDate: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  testRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  testDelta: { fontSize: 11 },
  testVal: { fontSize: 15 },
});
