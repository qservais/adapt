import React, { useEffect } from "react";
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
import { COLORS, FONTS } from "@/constants/theme";
import { BLOCK_TYPE_COLORS, BLOCK_TYPE_LABELS } from "@/constants/blockTypes";
import { getFreeSession, clearFreeSession, FreeSessionBlock, FreeSessionExercise } from "@/lib/freeSessionStore";
import { GradientButton } from "@/components/ui/GradientButton";
import { customFetch } from "@workspace/api-client-react";

function groupByBlock(
  exercises: FreeSessionExercise[],
  blocks: FreeSessionBlock[]
): { block: FreeSessionBlock | null; exercises: FreeSessionExercise[] }[] {
  const blockMap = new Map(blocks.map(b => [b.id, b]));
  const result: { block: FreeSessionBlock | null; exercises: FreeSessionExercise[] }[] = [];

  for (const ex of exercises) {
    const block = ex.blockId ? (blockMap.get(ex.blockId) ?? null) : null;
    const existing = result.find(g => g.block?.id === block?.id && (block !== null || g.block === null));
    if (existing) {
      existing.exercises.push(ex);
    } else {
      result.push({ block, exercises: [ex] });
    }
  }
  return result;
}

export default function FreeSessionIntroScreen() {
  const insets = useSafeAreaInsets();
  const session = getFreeSession();
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState("");

  useEffect(() => {
    if (!session) {
      router.replace("/library" as any);
    }
  }, []);

  if (!session) return null;

  const handleStart = async () => {
    setStarting(true);
    setStartError("");
    try {
      await customFetch(`/api/sessions/${session.sessionLogId}/start`, {
        method: "PUT",
      });
      router.push("/session/free-exercise");
    } catch {
      setStartError("Impossible de démarrer la séance");
    } finally {
      setStarting(false);
    }
  };

  const handleBack = async () => {
    try {
      await customFetch(`/api/sessions/${session.sessionLogId}`, { method: "DELETE" });
    } catch {
    }
    clearFreeSession();
    router.back();
  };

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.freeBadge}>
            <Feather name="zap" size={12} color={COLORS.cyan} />
            <Text style={[styles.freeBadgeText, { fontFamily: FONTS.mono }]}>SÉANCE LIBRE</Text>
          </View>
        </View>

        <View style={[styles.heroSection, { borderColor: `${COLORS.cyan}40` }]}>
          <Text style={[styles.heroTitle, { fontFamily: FONTS.title, color: COLORS.cyan }]}>
            {session.name}
          </Text>
          <View style={styles.heroMeta}>
            {session.estimatedDurationMin != null && (
              <View style={styles.metaChip}>
                <Feather name="clock" size={13} color={COLORS.textMuted} />
                <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
                  {session.estimatedDurationMin} MIN
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Feather name="list" size={13} color={COLORS.textMuted} />
              <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
                {session.exercises.length} EXERCICES
              </Text>
            </View>
            <View style={[styles.metaChip, { borderColor: `${COLORS.cyan}40`, backgroundColor: `${COLORS.cyan}10` }]}>
              <Feather name="zap" size={12} color={COLORS.cyan} />
              <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>
                À LA DEMANDE
              </Text>
            </View>
          </View>
        </View>

        {session.coachNotes != null && (
          <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.coachIconWrap}>
                <Feather name="info" size={14} color={COLORS.cyan} />
              </View>
              <Text style={[styles.coachLabel, { fontFamily: FONTS.mono }]}>DESCRIPTION</Text>
            </View>
            <Text style={[styles.coachText, { fontFamily: FONTS.body }]}>{session.coachNotes}</Text>
          </View>
        )}

        <View style={styles.exerciseList}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>PROGRAMME</Text>
          {(() => {
            const grouped = groupByBlock(session.exercises, session.blocks ?? []);
            let globalIdx = 0;
            return grouped.map((group) => {
              if (group.block === null) {
                return group.exercises.map((ex) => {
                  const idx = globalIdx++;
                  return (
                    <View key={ex.id} style={styles.exRow}>
                      <View style={styles.exThumbFallback}>
                        <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                          {String(idx + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>{ex.exerciseName}</Text>
                        <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                          {ex.sets}×{ex.reps}
                          {ex.restSeconds != null && ex.restSeconds > 0 ? ` · ${ex.restSeconds}s repos` : ""}
                        </Text>
                        {ex.coachCue != null && (
                          <Text style={[styles.exCue, { fontFamily: FONTS.body }]}>{ex.coachCue}</Text>
                        )}
                      </View>
                    </View>
                  );
                });
              }
              const blockType = group.block.type?.toLowerCase() ?? "superset";
              const accentColor = BLOCK_TYPE_COLORS[blockType] ?? COLORS.cyan;
              const typeLabel = BLOCK_TYPE_LABELS[blockType] ?? blockType.toUpperCase();
              const blockLabel = group.block.name
                ? `${typeLabel} · ${group.block.name.toUpperCase()}`
                : typeLabel;
              return (
                <View key={group.block.id} style={[styles.blockGroup, { borderColor: `${accentColor}40` }]}>
                  <View style={[styles.blockHeader, { backgroundColor: `${accentColor}12` }]}>
                    <View style={[styles.blockDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.blockLabel, { fontFamily: FONTS.mono, color: accentColor }]}>
                      {blockLabel}
                    </Text>
                  </View>
                  {group.exercises.map((ex) => {
                    const idx = globalIdx++;
                    return (
                      <View key={ex.id} style={[styles.exRow, styles.exRowInBlock]}>
                        <View style={[styles.exThumbFallback, styles.exThumbInBlock]}>
                          <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                            {String(idx + 1).padStart(2, "0")}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>{ex.exerciseName}</Text>
                          <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                            {ex.sets}×{ex.reps}
                            {ex.restSeconds != null && ex.restSeconds > 0 ? ` · ${ex.restSeconds}s repos` : ""}
                          </Text>
                          {ex.coachCue != null && (
                            <Text style={[styles.exCue, { fontFamily: FONTS.body }]}>{ex.coachCue}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            });
          })()}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {startError ? (
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{startError}</Text>
        ) : null}
        <GradientButton
          label={starting ? "DÉMARRAGE…" : "DÉMARRER LA SÉANCE"}
          onPress={handleStart}
          loading={starting}
          icon={<Feather name="play" size={18} color={COLORS.textInverse} />}
        />
      </View>
    </View>
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
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${COLORS.cyan}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}40`,
  },
  freeBadgeText: { fontSize: 10, color: COLORS.cyan, letterSpacing: 1.5 },
  heroSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: COLORS.bgCard,
    padding: 24,
    marginBottom: 16,
    gap: 16,
  },
  heroTitle: { fontSize: 40, letterSpacing: 2, lineHeight: 44 },
  heroMeta: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.5 },
  coachCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
    padding: 16,
    gap: 10,
  },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${COLORS.cyan}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  coachLabel: { fontSize: 10, color: COLORS.cyan, letterSpacing: 2 },
  coachText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  exerciseList: { paddingHorizontal: 20, marginBottom: 16, gap: 2 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 16 },
  exRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: "center",
  },
  exThumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  exNum: { fontSize: 12, color: COLORS.textMuted },
  exName: { fontSize: 15, color: COLORS.white, marginBottom: 3 },
  exDetail: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 0.3 },
  exCue: { fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", marginTop: 2 },
  blockGroup: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  blockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  blockLabel: {
    fontSize: 10,
    letterSpacing: 2,
  },
  exRowInBlock: {
    paddingHorizontal: 14,
  },
  exThumbInBlock: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
});
