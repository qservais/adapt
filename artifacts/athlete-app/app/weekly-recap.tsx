import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetWeeklyRecap } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";
import { useT } from "@/context/PreferencesContext";

function DeltaChip({ delta, unit, invert }: { delta?: number | null; unit?: string; invert?: boolean }) {
  if (delta == null) return null;
  const positive = invert ? delta < 0 : delta > 0;
  const neutral = delta === 0;
  const color = neutral ? COLORS.textMuted : positive ? COLORS.green : COLORS.red;
  const icon = neutral ? "minus" : positive ? "trending-up" : "trending-down";
  const prefix = delta > 0 ? "+" : "";
  return (
    <View style={[styles.chip, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Feather name={icon} size={10} color={color} />
      <Text style={[styles.chipText, { fontFamily: FONTS.mono, color }]}>
        {prefix}{delta}{unit ?? ""}
      </Text>
    </View>
  );
}

function StatRow({ label, value, delta, unit, invertDelta, color }: {
  label: string; value: string | number; delta?: number | null; unit?: string; invertDelta?: boolean; color?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={[styles.statValue, { fontFamily: FONTS.monoBold, color: color ?? COLORS.white }]}>
          {value}
        </Text>
        <DeltaChip delta={delta} unit={unit} invert={invertDelta} />
      </View>
    </View>
  );
}

export default function WeeklyRecapScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const recapQuery = useGetWeeklyRecap();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const recap = recapQuery.data?.recap;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  const completionPct = recap
    ? recap.sessionsPlanned > 0
      ? Math.round((recap.sessionsCompleted / recap.sessionsPlanned) * 100)
      : 100
    : 0;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("weekly_recap_uppercase", "BILAN SEMAINE")}</Text>
      </View>

      {recapQuery.isPending ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.cyan} />
          <Text style={[styles.loadingText, { fontFamily: FONTS.body }]}>{t("calculating", "Calcul en cours...")}</Text>
        </View>
      ) : recapQuery.isError || !recap ? (
        <View style={styles.centerWrap}>
          <Feather name="alert-circle" size={40} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            {t("no_data_week", "Pas encore de données pour cette semaine.")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateRange}>
            <Feather name="calendar" size={14} color={COLORS.textMuted} />
            <Text style={[styles.dateText, { fontFamily: FONTS.mono }]}>
              {formatDate(recap.weekStart)} — {formatDate(recap.weekEnd)}
            </Text>
          </View>

          <GlowCard glowColor={COLORS.violet} style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>{t("sessions_uppercase", "SÉANCES")}</Text>
            <View style={styles.completionRow}>
              <View style={styles.completionNumbers}>
                <Text style={[styles.completionBig, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>
                  {recap.sessionsCompleted}
                </Text>
                <Text style={[styles.completionSep, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                  /{recap.sessionsPlanned > 0 ? recap.sessionsPlanned : "—"}
                </Text>
              </View>
              {recap.sessionsPlanned > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.min(completionPct, 100)}%`, backgroundColor: COLORS.violet }]} />
                  </View>
                  <Text style={[styles.pctText, { fontFamily: FONTS.mono, color: COLORS.violet }]}>
                    {completionPct}%
                  </Text>
                </View>
              )}
            </View>
            {recap.sessionsDelta != null && (
              <View style={styles.deltaRow}>
                <Text style={[styles.deltaLabel, { fontFamily: FONTS.body }]}>{t("vs_prev_week", "vs semaine précédente :")}</Text>
                <DeltaChip delta={recap.sessionsDelta} />
              </View>
            )}
          </GlowCard>

          <GlowCard glowColor={COLORS.green} style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>{t("performances_uppercase", "PERFORMANCES")}</Text>
            <StatRow
              label={t("avg_adapt_score", "Score ADAPT moyen")}
              value={recap.avgAdaptScore != null ? recap.avgAdaptScore.toFixed(1) : "—"}
              delta={recap.scoreDelta != null ? Math.round(recap.scoreDelta) : null}
              color={COLORS.green}
            />
            <StatRow
              label={t("avg_rpe", "RPE moyen")}
              value={recap.avgRpe != null ? recap.avgRpe.toFixed(1) : "—"}
              delta={recap.rpeDelta != null ? Math.round(recap.rpeDelta * 10) / 10 : null}
              invertDelta
              color={COLORS.amber}
            />
            {(recap.totalVolumeKg ?? 0) > 0 && (
              <StatRow
                label={t("total_volume", "Volume total")}
                value={`${recap.totalVolumeKg?.toFixed(0)} kg`}
                delta={recap.volumeDelta != null ? Math.round(recap.volumeDelta) : null}
                unit=" kg"
                color={COLORS.cyan}
              />
            )}
            {(recap.prsCount ?? 0) > 0 && (
              <StatRow
                label={t("new_records", "Nouveaux records")}
                value={recap.prsCount!}
                color={COLORS.green}
              />
            )}
          </GlowCard>

          {(recap.prsCount ?? 0) === 0 && recap.sessionsCompleted === 0 && (
            <View style={styles.emptyCard}>
              <Feather name="moon" size={32} color={COLORS.textMuted} />
              <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                {t("no_session_this_week", "Aucune séance cette semaine. Commence aujourd'hui !")}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 28, color: COLORS.white, letterSpacing: 2 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  dateRange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 16,
  },
  dateText: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 1 },
  card: { gap: 12, marginBottom: 16 },
  cardTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
  completionRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  completionNumbers: { flexDirection: "row", alignItems: "baseline" },
  completionBig: { fontSize: 48 },
  completionSep: { fontSize: 20 },
  progressContainer: { flex: 1, gap: 6 },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  pctText: { fontSize: 11, textAlign: "right" },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deltaLabel: { fontSize: 12, color: COLORS.textMuted },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 10 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  statRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  statValue: { fontSize: 16 },
  emptyCard: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
});
