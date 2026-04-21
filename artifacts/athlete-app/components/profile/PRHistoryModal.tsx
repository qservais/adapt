import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useGetExercisePRHistory, type PRHistoryEntry } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";

interface PRHistoryModalProps {
  exerciseId: string | null;
  exerciseName: string;
  onClose: () => void;
}

const CHART_WIDTH = 310;
const CHART_HEIGHT = 140;
const PADDING = { top: 12, bottom: 28, left: 40, right: 16 };

function PRLineChart({ entries }: { entries: PRHistoryEntry[] }) {
  if (entries.length === 0) return null;

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const loads = entries.map((e) => e.loadKg);
  const minLoad = Math.min(...loads);
  const maxLoad = Math.max(...loads);
  const loadRange = maxLoad - minLoad || 1;

  const dates = entries.map((e) => new Date(e.achievedAt).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;

  const toX = (ts: number) => PADDING.left + ((ts - minDate) / dateRange) * innerW;
  const toY = (kg: number) =>
    PADDING.top + innerH - ((kg - minLoad) / loadRange) * innerH;

  const points = entries.map((e) => {
    const ts = new Date(e.achievedAt).getTime();
    return { x: toX(ts), y: toY(e.loadKg), entry: e };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const yTicks = [minLoad, minLoad + loadRange / 2, maxLoad].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );
  const xTicks = entries.length <= 5 ? entries : [entries[0], entries[entries.length - 1]];

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {yTicks.map((val, i) => {
        const y = toY(val);
        return (
          <React.Fragment key={`ytick-${i}`}>
            <Line
              x1={PADDING.left}
              y1={y}
              x2={CHART_WIDTH - PADDING.right}
              y2={y}
              stroke={COLORS.border}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <SvgText
              x={PADDING.left - 4}
              y={y + 4}
              fontSize={9}
              fill={COLORS.textMuted}
              textAnchor="end"
              fontFamily={FONTS.mono}
            >
              {val % 1 === 0 ? val : val.toFixed(1)}
            </SvgText>
          </React.Fragment>
        );
      })}

      {xTicks.map((e, i) => {
        const ts = new Date(e.achievedAt).getTime();
        const x = toX(ts);
        const label = new Date(e.achievedAt).toLocaleDateString("fr-FR", {
          month: "short",
          year: "2-digit",
        });
        return (
          <SvgText
            key={`xtick-${i}`}
            x={x}
            y={CHART_HEIGHT - 4}
            fontSize={8}
            fill={COLORS.textMuted}
            textAnchor="middle"
            fontFamily={FONTS.mono}
          >
            {label}
          </SvgText>
        );
      })}

      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={COLORS.cyan}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((p, i) => (
        <Circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 5 : 3}
          fill={i === points.length - 1 ? COLORS.cyan : COLORS.bgCard}
          stroke={COLORS.cyan}
          strokeWidth={i === points.length - 1 ? 0 : 1.5}
        />
      ))}
    </Svg>
  );
}

export function PRHistoryModal({ exerciseId, exerciseName, onClose }: PRHistoryModalProps) {
  const historyQuery = useGetExercisePRHistory(exerciseId ?? "");

  const entries = historyQuery.data?.history ?? [];
  const best = entries.length > 0 ? entries[entries.length - 1] : null;
  const first = entries.length > 0 ? entries[0] : null;
  const totalGain =
    best && first && entries.length > 1 ? best.loadKg - first.loadKg : null;

  return (
    <Modal
      visible={!!exerciseId}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { fontFamily: FONTS.mono }]}>PROGRESSION</Text>
              <Text style={[styles.title, { fontFamily: FONTS.bodyBold }]} numberOfLines={2}>
                {exerciseName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Feather name="x" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {historyQuery.isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.cyan} />
            </View>
          ) : historyQuery.isError ? (
            <View style={styles.emptyBox}>
              <Feather name="alert-circle" size={28} color={COLORS.textMuted} />
              <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                Impossible de charger l'historique
              </Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="bar-chart-2" size={28} color={COLORS.textMuted} />
              <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                Aucun historique encore.{"\n"}
                Tes prochains records apparaîtront ici.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {totalGain !== null && totalGain > 0 && (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryChip}>
                    <Feather name="trending-up" size={11} color={COLORS.cyan} />
                    <Text style={[styles.summaryChipText, { fontFamily: FONTS.mono }]}>
                      +{totalGain % 1 === 0 ? totalGain : totalGain.toFixed(1)} kg au total
                    </Text>
                  </View>
                  <Text style={[styles.summaryMeta, { fontFamily: FONTS.body }]}>
                    {entries.length} record{entries.length > 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              <View style={styles.chartWrap}>
                <PRLineChart entries={entries} />
              </View>

              <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono }]}>
                HISTORIQUE
              </Text>

              {[...entries].reverse().map((entry, idx) => {
                const isLatest = idx === 0;
                const date = new Date(entry.achievedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                return (
                  <View
                    key={entry.id}
                    style={[styles.historyRow, isLatest && styles.historyRowLatest]}
                  >
                    <View style={styles.historyLeft}>
                      {isLatest && (
                        <View style={styles.bestBadge}>
                          <Text style={[styles.bestBadgeText, { fontFamily: FONTS.mono }]}>
                            MEILLEUR
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.historyDate, { fontFamily: FONTS.body }]}>
                        {date}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.historyLoad,
                        { fontFamily: FONTS.monoBold, color: isLatest ? COLORS.cyan : COLORS.white },
                      ]}
                    >
                      {entry.loadKg} kg
                      <Text style={[styles.historyReps, { fontFamily: FONTS.mono }]}>
                        {entry.reps > 0 ? ` × ${entry.reps}` : ""}
                      </Text>
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 9,
    color: COLORS.cyan,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    color: COLORS.white,
    lineHeight: 22,
  },
  closeBtn: {
    padding: 4,
    marginTop: 4,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  summaryChipText: {
    fontSize: 11,
    color: COLORS.cyan,
    letterSpacing: 0.5,
  },
  summaryMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  chartWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  historyRowLatest: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
  },
  historyLeft: {
    gap: 4,
    flex: 1,
  },
  bestBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.cyan,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bestBadgeText: {
    fontSize: 8,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  historyDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  historyLoad: {
    fontSize: 17,
  },
  historyReps: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
