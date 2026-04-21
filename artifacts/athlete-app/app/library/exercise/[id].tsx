import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WebView } from "react-native-webview";
import { Svg, Polyline, Circle, Text as SvgText } from "react-native-svg";
import { customFetch, equipmentLabelFromKey } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { setFreeSession } from "@/lib/freeSessionStore";
import type { FreeSessionStartResponse } from "@workspace/api-client-react";

interface ExerciseHistoryEntry {
  id: string;
  setsCompleted: number | null;
  repsPerSet: number[] | null;
  loadKgUsed: number | null;
  notes: string | null;
  createdAt: string;
}

interface ExerciseDetail {
  id: string;
  name: string;
  category: string | null;
  muscleGroups: string[] | null;
  equipment: string[] | null;
  description: string | null;
  demoUrl: string | null;
  demoGifUrl: string | null;
  level: string | null;
  prKg: number | null;
  history: ExerciseHistoryEntry[];
}

const CATEGORY_LABELS: Record<string, string> = {
  compound: "Polyarticulaire",
  isolation: "Isolation",
  cardio: "Cardio",
  mobility: "Mobilité",
  core: "Gainage",
  power: "Puissance",
  plyometric: "Pliométrie",
  force: "Force",
  réathlétisation: "Réathlétisation",
  pliométrie: "Pliométrie",
  mobilité: "Mobilité",
};

const LEVEL_COLORS: Record<string, string> = {
  débutant: COLORS.green,
  intermédiaire: COLORS.amber,
  avancé: COLORS.red,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function computeVolume(entry: ExerciseHistoryEntry): number | null {
  if (entry.loadKgUsed == null || entry.loadKgUsed <= 0) return null;
  if (entry.repsPerSet == null || entry.repsPerSet.length === 0) return null;
  const totalReps = entry.repsPerSet.reduce((a, b) => a + b, 0);
  if (totalReps === 0) return null;
  return Math.round(entry.loadKgUsed * totalReps);
}

interface MiniLineChartProps {
  data: { value: number; label: string }[];
  color: string;
  unit: string;
  width: number;
}

function MiniLineChart({ data, color, unit, width }: MiniLineChartProps) {
  const height = 90;
  const padLeft = 8;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 28;

  if (data.length < 2) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textMuted }}>
          Données insuffisantes
        </Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y, label: d.label, value: d.value };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

  const lastPt = points[points.length - 1]!;
  const firstPt = points[0]!;

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 4 : 2.5}
          fill={i === points.length - 1 ? color : COLORS.bgCard}
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
      <SvgText
        x={firstPt.x}
        y={height - 6}
        fontSize="9"
        fill={COLORS.textMuted}
        textAnchor="middle"
        fontFamily={FONTS.mono}
      >
        {firstPt.label}
      </SvgText>
      <SvgText
        x={lastPt.x}
        y={height - 6}
        fontSize="9"
        fill={COLORS.textMuted}
        textAnchor="middle"
        fontFamily={FONTS.mono}
      >
        {lastPt.label}
      </SvgText>
      <SvgText
        x={lastPt.x}
        y={lastPt.y - 8}
        fontSize="10"
        fill={color}
        textAnchor="middle"
        fontFamily={FONTS.mono}
      >
        {lastPt.value}{unit}
      </SvgText>
    </Svg>
  );
}

export default function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();

  const [isStarting, setIsStarting] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDoNowSheet, setShowDoNowSheet] = useState(false);
  const [pendingSets, setPendingSets] = useState("3");
  const [pendingReps, setPendingReps] = useState("10");
  const [pendingLoad, setPendingLoad] = useState("");
  const [pendingRest, setPendingRest] = useState("90");

  const { data: exercise, isLoading, error } = useQuery<ExerciseDetail>({
    queryKey: ["/api/athlete/exercises", params.id],
    queryFn: () => customFetch(`/api/athlete/exercises/${params.id}`),
    enabled: params.id != null,
  });

  const openDoNowSheet = () => {
    if (!exercise) return;
    const lastEntry = exercise.history[0];
    setPendingSets(String(lastEntry?.setsCompleted ?? 3));
    setPendingReps(lastEntry?.repsPerSet != null && lastEntry.repsPerSet.length > 0
      ? String(lastEntry.repsPerSet[0])
      : "10");
    setPendingLoad(lastEntry?.loadKgUsed != null && lastEntry.loadKgUsed > 0
      ? String(lastEntry.loadKgUsed)
      : "");
    setPendingRest("90");
    setShowDoNowSheet(true);
  };

  const handleConfirmDoNow = async () => {
    if (isStarting || !exercise) return;
    setShowDoNowSheet(false);
    setIsStarting(true);
    try {
      const targetSets = parseInt(pendingSets, 10);
      const targetReps = parseInt(pendingReps, 10);
      const targetLoad = pendingLoad.trim().length > 0 ? parseFloat(pendingLoad) : undefined;
      const targetRestSeconds = parseInt(pendingRest, 10);

      const body: Record<string, unknown> = {};
      if (!isNaN(targetSets) && targetSets > 0) body.targetSets = targetSets;
      if (!isNaN(targetReps) && targetReps > 0) body.targetReps = targetReps;
      if (targetLoad !== undefined && !isNaN(targetLoad)) body.targetLoad = targetLoad;
      if (!isNaN(targetRestSeconds) && targetRestSeconds >= 15) body.targetRestSeconds = Math.min(600, targetRestSeconds);

      const data = await customFetch(`/api/athlete/exercises/${exercise.id}/do-now`, {
        method: "POST",
        body: JSON.stringify(body),
      }) as FreeSessionStartResponse & { isSingleExercise?: boolean };
      setFreeSession({
        sessionLogId: data.sessionLogId,
        name: data.name,
        mode: data.mode,
        isFreeSession: true,
        isSingleExercise: true,
        isRoutine: false,
        routineId: null,
        adaptScore: data.adaptScore ?? 50,
        coachNotes: data.coachNotes ?? null,
        estimatedDurationMin: data.estimatedDurationMin ?? null,
        exercises: data.exercises ?? [],
        athletePRs: data.athletePRs ?? {},
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/athlete/exercises", params.id] });
      router.push("/session/free-exercise" as any);
    } catch {
      Alert.alert("Erreur", "Impossible de lancer l'exercice. Réessaie.");
    } finally {
      setIsStarting(false);
    }
  };

  const hasDemo = (exercise?.demoUrl ?? "").length > 0 || (exercise?.demoGifUrl ?? "").length > 0;
  const demoUri = exercise?.demoUrl || exercise?.demoGifUrl || null;
  const levelColor = exercise?.level ? (LEVEL_COLORS[exercise.level] ?? COLORS.cyan) : COLORS.cyan;

  const chartWidth = screenWidth - 40 - 28;

  const loadChartData = exercise?.history
    ? [...exercise.history]
        .reverse()
        .filter(h => h.loadKgUsed != null && h.loadKgUsed > 0)
        .map(h => ({ value: h.loadKgUsed!, label: formatDateShort(h.createdAt) }))
    : [];

  const volumeChartData = exercise?.history
    ? [...exercise.history]
        .reverse()
        .reduce<{ value: number; label: string }[]>((acc, h) => {
          const vol = computeVolume(h);
          if (vol != null) acc.push({ value: vol, label: formatDateShort(h.createdAt) });
          return acc;
        }, [])
    : [];

  const showCharts = loadChartData.length >= 2 || volumeChartData.length >= 2;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 100,
          paddingHorizontal: 20,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          <Text style={[styles.backText, { fontFamily: FONTS.body }]}>Bibliothèque</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.cyan} size="large" />
          </View>
        )}

        {error != null && (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>Exercice introuvable.</Text>
          </View>
        )}

        {exercise != null && (
          <>
            <View style={styles.heroSection}>
              {exercise.category != null && (
                <Text style={[styles.categoryLabel, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>
                  {(CATEGORY_LABELS[exercise.category] ?? exercise.category).toUpperCase()}
                </Text>
              )}
              <Text style={[styles.exerciseTitle, { fontFamily: FONTS.title }]}>
                {exercise.name}
              </Text>
              <View style={styles.metaRow}>
                {exercise.level != null && (
                  <View style={[styles.metaBadge, { borderColor: `${levelColor}40`, backgroundColor: `${levelColor}12` }]}>
                    <Feather name="bar-chart-2" size={13} color={levelColor} />
                    <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: levelColor }]}>
                      {exercise.level}
                    </Text>
                  </View>
                )}
                {hasDemo && (
                  <TouchableOpacity
                    onPress={() => setShowDemoModal(true)}
                    style={[styles.metaBadge, { borderColor: `${COLORS.violet}40`, backgroundColor: `${COLORS.violet}12` }]}
                  >
                    <Feather name="play-circle" size={13} color={COLORS.violet} />
                    <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.violet }]}>
                      Voir démo
                    </Text>
                  </TouchableOpacity>
                )}
                {exercise.prKg != null && exercise.prKg > 0 && (
                  <View style={[styles.metaBadge, { borderColor: `${COLORS.amber}50`, backgroundColor: `${COLORS.amber}15` }]}>
                    <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.amber }]}>
                      🏆 PR — {exercise.prKg} kg
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {(exercise.muscleGroups ?? []).length > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Feather name="target" size={14} color={COLORS.cyan} />
                  <Text style={[styles.infoCardLabel, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>MUSCLES</Text>
                </View>
                <View style={styles.tagRow}>
                  {(exercise.muscleGroups ?? []).map(mg => (
                    <View key={mg} style={styles.tag}>
                      <Text style={[styles.tagText, { fontFamily: FONTS.mono }]}>{mg}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(exercise.equipment ?? []).filter(e => e !== "Aucun" && e !== "aucun").length > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Feather name="package" size={14} color={COLORS.amber} />
                  <Text style={[styles.infoCardLabel, { fontFamily: FONTS.mono, color: COLORS.amber }]}>ÉQUIPEMENT</Text>
                </View>
                <View style={styles.tagRow}>
                  {(exercise.equipment ?? []).filter(e => e !== "Aucun" && e !== "aucun").map(eq => (
                    <View key={eq} style={[styles.tag, { borderColor: `${COLORS.amber}30` }]}>
                      <Text style={[styles.tagText, { fontFamily: FONTS.mono }]}>{equipmentLabelFromKey(eq)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {exercise.description != null && exercise.description.length > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Feather name="info" size={14} color={COLORS.textMuted} />
                  <Text style={[styles.infoCardLabel, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>INSTRUCTIONS</Text>
                </View>
                <Text style={[styles.description, { fontFamily: FONTS.body }]}>
                  {exercise.description}
                </Text>
              </View>
            )}

            {showCharts && (
              <>
                <View style={styles.divider} />

                <View style={styles.historySectionHeader}>
                  <Feather name="trending-up" size={14} color={COLORS.textMuted} />
                  <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>PROGRESSION</Text>
                </View>

                <View style={styles.chartsRow}>
                  {loadChartData.length >= 2 && (
                    <View style={[styles.chartCard, { flex: volumeChartData.length >= 2 ? 1 : undefined, width: volumeChartData.length >= 2 ? undefined : chartWidth }]}>
                      <View style={styles.chartCardHeader}>
                        <Feather name="trending-up" size={11} color={COLORS.green} />
                        <Text style={[styles.chartCardLabel, { fontFamily: FONTS.mono, color: COLORS.green }]}>
                          CHARGE
                        </Text>
                      </View>
                      <MiniLineChart
                        data={loadChartData}
                        color={COLORS.green}
                        unit=" kg"
                        width={volumeChartData.length >= 2 ? (chartWidth / 2 - 8) : chartWidth}
                      />
                    </View>
                  )}
                  {volumeChartData.length >= 2 && (
                    <View style={[styles.chartCard, { flex: loadChartData.length >= 2 ? 1 : undefined, width: loadChartData.length >= 2 ? undefined : chartWidth }]}>
                      <View style={styles.chartCardHeader}>
                        <Feather name="activity" size={11} color={COLORS.violet} />
                        <Text style={[styles.chartCardLabel, { fontFamily: FONTS.mono, color: COLORS.violet }]}>
                          VOLUME
                        </Text>
                      </View>
                      <MiniLineChart
                        data={volumeChartData}
                        color={COLORS.violet}
                        unit=" kg"
                        width={loadChartData.length >= 2 ? (chartWidth / 2 - 8) : chartWidth}
                      />
                    </View>
                  )}
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.historySectionHeader}>
              <Feather name="clock" size={14} color={COLORS.textMuted} />
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>HISTORIQUE</Text>
            </View>

            {exercise.history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Feather name="activity" size={28} color={COLORS.textMuted} />
                <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                  Aucune performance enregistrée encore.
                </Text>
                <Text style={[styles.emptySubText, { fontFamily: FONTS.body }]}>
                  Lance cet exercice pour commencer à suivre ta progression.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {exercise.history.map((entry, idx) => {
                  const vol = computeVolume(entry);
                  return (
                    <View key={entry.id} style={styles.historyCard}>
                      <View style={styles.historyCardLeft}>
                        <Text style={[styles.historyDate, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                          {formatDate(entry.createdAt)}
                        </Text>
                        <View style={styles.historyStats}>
                          {entry.setsCompleted != null && (
                            <View style={styles.historyStat}>
                              <Feather name="repeat" size={11} color={COLORS.cyan} />
                              <Text style={[styles.historyStatText, { fontFamily: FONTS.mono, color: COLORS.cyan }]}>
                                {entry.setsCompleted} série{entry.setsCompleted > 1 ? "s" : ""}
                              </Text>
                            </View>
                          )}
                          {entry.loadKgUsed != null && entry.loadKgUsed > 0 && (
                            <View style={styles.historyStat}>
                              <Feather name="trending-up" size={11} color={COLORS.green} />
                              <Text style={[styles.historyStatText, { fontFamily: FONTS.mono, color: COLORS.green }]}>
                                {entry.loadKgUsed} kg
                              </Text>
                            </View>
                          )}
                          {vol != null && (
                            <View style={styles.historyStat}>
                              <Feather name="activity" size={11} color={COLORS.violet} />
                              <Text style={[styles.historyStatText, { fontFamily: FONTS.mono, color: COLORS.violet }]}>
                                {vol} kg vol.
                              </Text>
                            </View>
                          )}
                        </View>
                        {entry.notes != null && entry.notes.length > 0 && (
                          <Text style={[styles.historyNotes, { fontFamily: FONTS.body }]} numberOfLines={2}>
                            {entry.notes}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.historyIndex, idx === 0 && { backgroundColor: `${COLORS.cyan}20`, borderColor: `${COLORS.cyan}40` }]}>
                        <Text style={[styles.historyIndexText, { fontFamily: FONTS.mono, color: idx === 0 ? COLORS.cyan : COLORS.textMuted }]}>
                          {idx === 0 ? "★" : String(exercise.history.length - idx)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {exercise != null && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            onPress={openDoNowSheet}
            disabled={isStarting}
            style={[styles.doNowBtn, isStarting && { opacity: 0.7 }]}
            activeOpacity={0.85}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Feather name="play" size={20} color={COLORS.bg} />
            )}
            <Text style={[styles.doNowText, { fontFamily: FONTS.bodyBold }]}>
              {isStarting ? "Préparation..." : "Faire maintenant"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showDemoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDemoModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontFamily: FONTS.mono }]} numberOfLines={1}>
              {exercise?.name ?? "Démo"}
            </Text>
            <TouchableOpacity onPress={() => setShowDemoModal(false)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {demoUri != null && (
            <WebView
              source={{ uri: demoUri }}
              style={styles.webView}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              startInLoadingState
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={showDoNowSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDoNowSheet(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowDoNowSheet(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrapper}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Feather name="sliders" size={16} color={COLORS.cyan} />
              <Text style={[styles.sheetTitle, { fontFamily: FONTS.mono }]}>CONFIGURER L'EXERCICE</Text>
            </View>

            <Text style={[styles.sheetSubtitle, { fontFamily: FONTS.body }]}>
              Ajuste les paramètres avant de commencer.
            </Text>

            <View style={styles.sheetFields}>
              <View style={styles.sheetField}>
                <Text style={[styles.sheetFieldLabel, { fontFamily: FONTS.mono }]}>SÉRIES</Text>
                <View style={styles.sheetInputRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingSets(s => {
                      const v = parseInt(s, 10);
                      return isNaN(v) ? "3" : String(Math.max(1, v - 1));
                    })}
                  >
                    <Feather name="minus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.sheetInput, { fontFamily: FONTS.mono }]}
                    value={pendingSets}
                    onChangeText={setPendingSets}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingSets(s => {
                      const v = parseInt(s, 10);
                      return isNaN(v) ? "3" : String(Math.min(20, v + 1));
                    })}
                  >
                    <Feather name="plus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sheetField}>
                <Text style={[styles.sheetFieldLabel, { fontFamily: FONTS.mono }]}>RÉPÉTITIONS</Text>
                <View style={styles.sheetInputRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingReps(r => {
                      const v = parseInt(r, 10);
                      return isNaN(v) ? "10" : String(Math.max(1, v - 1));
                    })}
                  >
                    <Feather name="minus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.sheetInput, { fontFamily: FONTS.mono }]}
                    value={pendingReps}
                    onChangeText={setPendingReps}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingReps(r => {
                      const v = parseInt(r, 10);
                      return isNaN(v) ? "10" : String(Math.min(100, v + 1));
                    })}
                  >
                    <Feather name="plus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sheetField}>
                <Text style={[styles.sheetFieldLabel, { fontFamily: FONTS.mono }]}>CHARGE (KG)</Text>
                <View style={styles.sheetInputRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingLoad(l => {
                      const v = parseFloat(l);
                      if (isNaN(v) || v <= 0) return "";
                      const next = Math.max(0, v - 2.5);
                      return next === 0 ? "" : String(next);
                    })}
                  >
                    <Feather name="minus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.sheetInput, { fontFamily: FONTS.mono }]}
                    value={pendingLoad}
                    onChangeText={setPendingLoad}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={6}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingLoad(l => {
                      const v = parseFloat(l);
                      const base = isNaN(v) ? 0 : v;
                      return String(base + 2.5);
                    })}
                  >
                    <Feather name="plus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sheetField}>
                <Text style={[styles.sheetFieldLabel, { fontFamily: FONTS.mono }]}>REPOS (S)</Text>
                <View style={styles.sheetInputRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingRest(r => {
                      const v = parseInt(r, 10);
                      return isNaN(v) ? "90" : String(Math.max(15, v - 15));
                    })}
                  >
                    <Feather name="minus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.sheetInput, { fontFamily: FONTS.mono }]}
                    value={pendingRest}
                    onChangeText={setPendingRest}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setPendingRest(r => {
                      const v = parseInt(r, 10);
                      return isNaN(v) ? "90" : String(Math.min(600, v + 15));
                    })}
                  >
                    <Feather name="plus" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.sheetConfirmBtn}
              onPress={handleConfirmDoNow}
              activeOpacity={0.85}
            >
              <Feather name="play" size={18} color={COLORS.bg} />
              <Text style={[styles.sheetConfirmText, { fontFamily: FONTS.bodyBold }]}>
                Lancer la séance
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  backText: { fontSize: 15, color: COLORS.textSecondary },
  center: { alignItems: "center", paddingVertical: 60 },
  errorBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 14, textAlign: "center" },
  heroSection: { gap: 8 },
  categoryLabel: { fontSize: 11, letterSpacing: 2 },
  exerciseTitle: { fontSize: 28, color: COLORS.white, letterSpacing: 1 },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  metaText: { fontSize: 12 },
  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoCardLabel: { fontSize: 11, letterSpacing: 1.5 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
    backgroundColor: `${COLORS.cyan}10`,
  },
  tagText: { fontSize: 12, color: COLORS.textSecondary },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  divider: { height: 1, backgroundColor: COLORS.border },
  historySectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  chartsRow: { flexDirection: "row", gap: 12 },
  chartCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 6,
    overflow: "hidden",
  },
  chartCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartCardLabel: { fontSize: 10, letterSpacing: 1.5 },
  emptyHistory: { alignItems: "center", gap: 10, paddingVertical: 24 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  emptySubText: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 19, paddingHorizontal: 20 },
  historyList: { gap: 10 },
  historyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  historyCardLeft: { flex: 1, gap: 6 },
  historyDate: { fontSize: 11, letterSpacing: 0.5 },
  historyStats: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  historyStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  historyStatText: { fontSize: 13 },
  historyNotes: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  historyIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIndexText: { fontSize: 12 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  doNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  doNowText: { fontSize: 16, color: COLORS.bg },
  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 14, color: COLORS.white, flex: 1, letterSpacing: 1 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  webView: { flex: 1 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 12,
    color: COLORS.cyan,
    letterSpacing: 2,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: -8,
  },
  sheetFields: {
    gap: 14,
  },
  sheetField: {
    gap: 6,
  },
  sheetFieldLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  sheetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  stepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.white,
    textAlign: "center",
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  sheetConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  sheetConfirmText: {
    fontSize: 16,
    color: COLORS.bg,
  },
});
