import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetCheckinHistory, useGetPersonalRecords } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT, useFormatWeight } from "@/context/PreferencesContext";
import { GlowCard } from "@/components/ui/GlowCard";
import { formatRecordValue, recordGain } from "@/lib/formatRecord";
import { PRHistoryModal } from "@/components/profile/PRHistoryModal";

interface CheckinItem {
  date: string;
  adaptScore: number;
}

export default function ProgressionScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const formatWeight = useFormatWeight();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const [selectedPr, setSelectedPr] = useState<{ id: string; name: string } | null>(null);

  const checkinQuery = useGetCheckinHistory();
  const prQuery = useGetPersonalRecords();

  const checkins = ((checkinQuery.data ?? []) as CheckinItem[])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const thisWeekScores = checkins.filter((c) => new Date(c.date) >= sevenDaysAgo).map((c) => c.adaptScore);
  const lastWeekScores = checkins.filter((c) => new Date(c.date) >= fourteenDaysAgo && new Date(c.date) < sevenDaysAgo).map((c) => c.adaptScore);
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const thisWeekAvg = avg(thisWeekScores);
  const lastWeekAvg = avg(lastWeekScores);
  const scoreDelta = thisWeekAvg != null && lastWeekAvg != null ? thisWeekAvg - lastWeekAvg : null;

  const allPrs = prQuery.data?.personalRecords ?? [];
  const recentPrs = [...allPrs]
    .sort((a, b) => {
      if (a.isRecent && !b.isRecent) return -1;
      if (!a.isRecent && b.isRecent) return 1;
      return new Date(b.achievedAt ?? 0).getTime() - new Date(a.achievedAt ?? 0).getTime();
    })
    .slice(0, 5);

  const loading = checkinQuery.isLoading || prQuery.isLoading;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 20,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("my_progress_uc", "TA PROGRESSION")}</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} />
        </View>
      )}

      {!loading && (
        <>
          <GlowCard glowColor={COLORS.cyan} style={styles.scoreCard}>
            <Text style={[styles.cardTitle, { fontFamily: FONTS.mono }]}>SCORE ADAPT — 7 DERNIERS JOURS</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
                {thisWeekAvg != null ? thisWeekAvg.toFixed(0) : "—"}
              </Text>
              {scoreDelta != null && (
                <Text style={[styles.scoreDelta, { fontFamily: FONTS.mono, color: scoreDelta >= 0 ? COLORS.green : COLORS.amber }]}>
                  {scoreDelta >= 0 ? "↑ +" : "↓ "}{Math.abs(scoreDelta).toFixed(0)} vs semaine préc.
                </Text>
              )}
            </View>
          </GlowCard>

          <View style={styles.prSection}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="trending-up" size={14} color={COLORS.cyan} />
              <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>
                {t("recent_records_uc", "DERNIERS RECORDS")}
              </Text>
            </View>

            {recentPrs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="award" size={28} color={COLORS.textMuted} />
                <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                  {t("no_records_yet", "Tes records personnels apparaîtront ici après tes séances.")}
                </Text>
              </View>
            ) : (
              recentPrs.map((pr, idx) => {
                const gain = pr.previousValue != null ? recordGain(pr.recordType, pr.value, pr.previousValue) : null;
                return (
                  <TouchableOpacity
                    key={`${pr.exerciseId}-${idx}`}
                    style={[styles.prRow, pr.isRecent && styles.prRowRecent]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedPr({ id: pr.exerciseId, name: pr.exerciseName })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prName, { fontFamily: FONTS.bodyMedium }]} numberOfLines={1}>{pr.exerciseName}</Text>
                      {pr.isRecent && (
                        <Text style={[styles.prNewLabel, { fontFamily: FONTS.mono }]}>NOUVEAU</Text>
                      )}
                    </View>
                    <View style={styles.prRight}>
                      {gain != null && gain > 0 && (
                        <Text style={[styles.prGain, { fontFamily: FONTS.mono }]}>
                          +{pr.recordType === "load" ? formatWeight(gain) : gain}
                        </Text>
                      )}
                      <Text style={[styles.prValue, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
                        {formatRecordValue(pr.recordType, pr.value, formatWeight)}
                      </Text>
                      <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.linksRow}>
            <TouchableOpacity
              style={styles.linkCard}
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/profile" as any)}
            >
              <Feather name="award" size={18} color={COLORS.violet} />
              <Text style={[styles.linkText, { fontFamily: FONTS.bodyMedium }]}>{t("all_records", "Tous mes records")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkCard}
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/stats" as any)}
            >
              <Feather name="bar-chart-2" size={18} color={COLORS.cyan} />
              <Text style={[styles.linkText, { fontFamily: FONTS.bodyMedium }]}>{t("detailed_stats", "Stats détaillées")}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <PRHistoryModal
        exerciseId={selectedPr?.id ?? null}
        exerciseName={selectedPr?.name ?? ""}
        onClose={() => setSelectedPr(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 26, color: COLORS.white, letterSpacing: 2 },
  center: { alignItems: "center", paddingVertical: 40 },
  cardTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  scoreCard: { gap: 10 },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  scoreVal: { fontSize: 40 },
  scoreDelta: { fontSize: 13 },
  prSection: { gap: 8 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5 },
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 10 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" },
  prRow: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prRowRecent: { borderColor: `${COLORS.cyan}50` },
  prName: { fontSize: 14, color: COLORS.white },
  prNewLabel: { fontSize: 9, color: COLORS.cyan, letterSpacing: 1, marginTop: 2 },
  prRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  prGain: { fontSize: 11, color: COLORS.green },
  prValue: { fontSize: 14 },
  linksRow: { flexDirection: "row", gap: 10 },
  linkCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  linkText: { fontSize: 12, color: COLORS.textSecondary, textAlign: "center" },
});
