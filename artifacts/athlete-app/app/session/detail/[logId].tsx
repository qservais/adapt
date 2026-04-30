import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetSessionHistory } from "@workspace/api-client-react";
import type { SessionExerciseLog, SessionLogBlock } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { BLOCK_TYPE_COLORS, BLOCK_TYPE_LABELS } from "@/constants/blockTypes";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GlowCard } from "@/components/ui/GlowCard";

const DIFFICULTY_LABELS: Record<string, string> = {
  too_easy: "Trop facile",
  well_calibrated: "Parfait",
  too_hard: "Trop difficile",
};

function groupExercisesByBlock(
  exercises: SessionExerciseLog[],
  blocks: SessionLogBlock[]
): { block: SessionLogBlock | null; exercises: SessionExerciseLog[] }[] {
  if (blocks.length === 0) {
    return [{ block: null, exercises }];
  }

  const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  const knownBlockIds = new Set(blocks.map((b) => b.id));
  const blockMap = new Map<string, SessionExerciseLog[]>();
  const unassigned: SessionExerciseLog[] = [];

  for (const ex of exercises) {
    if (ex.blockId && knownBlockIds.has(ex.blockId)) {
      if (!blockMap.has(ex.blockId)) blockMap.set(ex.blockId, []);
      blockMap.get(ex.blockId)!.push(ex);
    } else {
      unassigned.push(ex);
    }
  }

  const result: { block: SessionLogBlock | null; exercises: SessionExerciseLog[] }[] = [];
  for (const block of sortedBlocks) {
    const exs = blockMap.get(block.id) ?? [];
    if (exs.length > 0) result.push({ block, exercises: exs });
  }
  if (unassigned.length > 0) result.push({ block: null, exercises: unassigned });
  return result;
}

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const historyQuery = useGetSessionHistory();

  const log = historyQuery.data?.find((l) => l.id === logId);
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const mode = (log?.variantMode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.normal;

  if (historyQuery.isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, paddingTop: topPad + 16 }]}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { fontFamily: FONTS.body }]}>Chargement…</Text>
        </View>
      </View>
    );
  }

  if (!log) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, paddingTop: topPad + 16 }]}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerState}>
          <Feather name="alert-circle" size={32} color={COLORS.textMuted} />
          <Text style={[styles.stateText, { fontFamily: FONTS.body }]}>Séance introuvable</Text>
        </View>
      </View>
    );
  }

  const completedDate = log.completedAt != null ? new Date(log.completedAt) : null;
  const dateStr = completedDate
    ? completedDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const exercises = log.exercises ?? [];
  const blocks = log.blocks ?? [];
  const hasBlocks = blocks.length > 0;
  const grouped = groupExercisesByBlock(exercises, blocks);

  let _idx = 0;
  const groupedWithIndices = grouped.map(({ block, exercises: gExs }) => ({
    block,
    exercises: gExs.map((ex) => ({ ex, num: ++_idx })),
  }));

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { fontFamily: FONTS.mono }]}>DÉTAIL SÉANCE</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.content}>
        <GlowCard glowColor={cfg.color} intensity="medium" style={styles.headerCard}>
          <View style={styles.headerTop}>
            <ModeBadge mode={mode} size="md" glow />
            {log.durationMin != null && (
              <View style={styles.durationPill}>
                <Feather name="clock" size={13} color={COLORS.textSecondary} />
                <Text style={[styles.durationText, { fontFamily: FONTS.mono }]}>
                  {log.durationMin} min
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.sessionName, { fontFamily: FONTS.title, color: cfg.color }]}>
            {log.sessionName ?? "Séance libre"}
          </Text>
          {dateStr != null && (
            <Text style={[styles.dateText, { fontFamily: FONTS.mono }]}>{dateStr}</Text>
          )}
        </GlowCard>

        {(log.rpe != null || log.perceivedDifficulty != null || log.athleteNotes) && (
          <GlowCard glowColor={COLORS.border} style={styles.feedbackCard}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>RESSENTI</Text>
            <View style={styles.feedbackGrid}>
              {log.rpe != null && (
                <View style={styles.feedbackItem}>
                  <Text style={[styles.feedbackVal, { fontFamily: FONTS.monoBold, color: COLORS.amber }]}>
                    {log.rpe}
                  </Text>
                  <Text style={[styles.feedbackLabel, { fontFamily: FONTS.body }]}>RPE</Text>
                </View>
              )}
              {log.perceivedDifficulty != null && (
                <View style={styles.feedbackItem}>
                  <Text style={[styles.feedbackVal, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>
                    {DIFFICULTY_LABELS[log.perceivedDifficulty] ?? log.perceivedDifficulty}
                  </Text>
                  <Text style={[styles.feedbackLabel, { fontFamily: FONTS.body }]}>Difficulté</Text>
                </View>
              )}
            </View>
            {log.athleteNotes != null && log.athleteNotes.trim() !== "" && (
              <View style={styles.notesBlock}>
                <Text style={[styles.notesLabel, { fontFamily: FONTS.mono }]}>NOTES</Text>
                <Text style={[styles.notesText, { fontFamily: FONTS.body }]}>{log.athleteNotes}</Text>
              </View>
            )}
          </GlowCard>
        )}

        {exercises.length > 0 && (
          <GlowCard glowColor={COLORS.border} style={styles.exercisesCard}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
              EXERCICES ({exercises.length})
            </Text>
            {groupedWithIndices.map(({ block, exercises: groupExs }, gi) => {
              const blockType = block?.type?.toLowerCase() ?? "";
              const accentColor = block ? (BLOCK_TYPE_COLORS[blockType] ?? COLORS.cyan) : null;
              const typeLabel = block ? (BLOCK_TYPE_LABELS[blockType] ?? blockType.toUpperCase()) : null;
              const blockLabel = block
                ? block.name ? `${typeLabel} · ${block.name.toUpperCase()}` : typeLabel
                : null;

              return (
                <View key={block?.id ?? "unassigned"} style={gi > 0 ? { marginTop: 4 } : undefined}>
                  {hasBlocks && blockLabel != null && accentColor != null && (
                    <View
                      style={[
                        styles.blockBanner,
                        {
                          backgroundColor: `${accentColor}12`,
                          borderColor: `${accentColor}30`,
                        },
                      ]}
                    >
                      <View style={[styles.blockDot, { backgroundColor: accentColor }]} />
                      <Text style={[styles.blockLabel, { fontFamily: FONTS.mono, color: accentColor }]}>
                        {blockLabel}
                      </Text>
                    </View>
                  )}
                  {groupExs.map(({ ex, num }) => {
                    const isLast =
                      gi === groupedWithIndices.length - 1 &&
                      num === groupExs[groupExs.length - 1]?.num;
                    return (
                      <View
                        key={ex.exerciseId ?? num}
                        style={[styles.exRow, isLast && styles.exRowLast]}
                      >
                        <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                          {String(num).padStart(2, "0")}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>
                            {ex.exerciseName !== "" ? ex.exerciseName : "Exercice inconnu"}
                          </Text>
                          <View style={styles.exMeta}>
                            {ex.setsCompleted != null && (
                              <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                                {ex.setsCompleted} série{ex.setsCompleted !== 1 ? "s" : ""}
                              </Text>
                            )}
                            {ex.loadKgUsed != null && (
                              <Text style={[styles.exLoad, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
                                {ex.loadKgUsed} kg
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </GlowCard>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  content: { paddingHorizontal: 20, gap: 16 },
  headerCard: { gap: 8 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  durationPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationText: { fontSize: 12, color: COLORS.textSecondary },
  sessionName: { fontSize: 34, letterSpacing: 1.5, lineHeight: 40 },
  dateText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5, marginTop: 2 },
  sectionTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 12 },
  feedbackCard: { gap: 12 },
  feedbackGrid: { flexDirection: "row", gap: 24 },
  feedbackItem: { alignItems: "center", gap: 2 },
  feedbackVal: { fontSize: 28 },
  feedbackLabel: { fontSize: 12, color: COLORS.textSecondary },
  notesBlock: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  notesLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1.5 },
  notesText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  exercisesCard: { gap: 0 },
  blockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: -16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  blockDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  blockLabel: { fontSize: 9, letterSpacing: 2 },
  exRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exRowLast: { borderBottomWidth: 0 },
  exNum: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, minWidth: 24 },
  exName: { fontSize: 15, color: COLORS.white, marginBottom: 4 },
  exMeta: { flexDirection: "row", gap: 12, alignItems: "center" },
  exDetail: { fontSize: 12, color: COLORS.textSecondary },
  exLoad: { fontSize: 13 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  stateText: { fontSize: 15, color: COLORS.textMuted },
});
