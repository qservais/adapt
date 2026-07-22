import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { COLORS, FONTS } from "@/constants/theme";
import type { CheckinData } from "@workspace/api-client-react";

/**
 * 14-day ADAPT score trend, matching the mockup's FormTrendChart. Plots the
 * real 0-100 production adaptScore (not the mockup's 0-5 placeholder scale)
 * over the last 14 calendar days, with a gap (grey dot, no connecting line)
 * on any day with no check-in.
 */

const CHART_WIDTH = 300;
const CHART_HEIGHT = 90;
const PAD = 8;

interface FormTrendChartProps {
  history: CheckinData[]; // any window >= 14 days, most recent first or unordered — we bucket by date
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().split("T")[0]!);
  }
  return days;
}

export function FormTrendChart({ history }: FormTrendChartProps) {
  const days = lastNDays(14);
  const byDate = new Map(history.map((c) => [c.date, c.adaptScore]));
  const data: Array<number | null> = days.map((d) => byDate.get(d) ?? null);

  const valid = data.filter((v): v is number => v !== null);
  const last7 = data.slice(-7).filter((v): v is number => v !== null);
  const avg7 = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : null;

  const innerW = CHART_WIDTH - 2 * PAD;
  const innerH = CHART_HEIGHT - 2 * PAD;
  const x = (i: number) => PAD + (i / (data.length - 1)) * innerW;
  const y = (v: number) => PAD + innerH - (v / 100) * innerH;

  const segments: string[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    const a = data[i];
    const b = data[i + 1];
    if (a !== null && b !== null) {
      segments.push(`M ${x(i)} ${y(a)} L ${x(i + 1)} ${y(b)}`);
    }
  }

  if (valid.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { fontFamily: FONTS.mono }]}>TON ÉTAT DE FORME · 14 JOURS</Text>
        {avg7 !== null && (
          <Text style={[styles.label, { fontFamily: FONTS.mono }]}>
            MOY. 7J : <Text style={{ color: avg7 >= 60 ? COLORS.cyan : COLORS.amber }}>{Math.round(avg7)}/100</Text>
          </Text>
        )}
      </View>

      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Line x1={PAD} y1={y(50)} x2={CHART_WIDTH - PAD} y2={y(50)} stroke="rgba(255,255,255,0.1)" strokeDasharray="3,4" strokeWidth={1} />
        {segments.map((d, i) => (
          <Path key={i} d={d} stroke={COLORS.cyan} strokeWidth={2} fill="none" strokeLinecap="round" />
        ))}
        {data.map((v, i) =>
          v === null ? (
            <Circle key={i} cx={x(i)} cy={y(50)} r={1.5} fill="rgba(255,255,255,0.15)" />
          ) : (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={i === data.length - 1 ? 4 : 2.5}
              fill={i === data.length - 1 ? COLORS.white : COLORS.cyan}
              stroke={i === data.length - 1 ? COLORS.cyan : "none"}
              strokeWidth={2}
            />
          )
        )}
      </Svg>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>il y a 2 sem.</Text>
        <Text style={styles.footerText}>aujourd'hui</Text>
      </View>

      <Text style={[styles.hint, { fontFamily: FONTS.body }]}>
        Il n'y a pas de bon ou mauvais score — juste ta réalité du moment. Les points gris = check-in manqué.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    padding: 16,
    width: "100%",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  footerText: { fontSize: 9, color: COLORS.textMuted, fontWeight: "600" },
  hint: { fontSize: 10, color: COLORS.textMuted, marginTop: 10, lineHeight: 14 },
});
