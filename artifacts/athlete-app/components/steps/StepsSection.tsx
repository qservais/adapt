import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pedometer } from "expo-sensors";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";

interface StepRow {
  id: string;
  date: string;
  steps: number;
  goal: number;
  source: string;
}

interface StepsData {
  today: StepRow | null;
  history: StepRow[];
}

type HistoryPeriod = "7" | "14" | "30";
type PermissionStatus = "unknown" | "granted" | "denied" | "unavailable";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  return { start, end };
}

export function StepsSection() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<HistoryPeriod>("7");
  const [modalVisible, setModalVisible] = useState(false);
  const [stepsInput, setStepsInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [pedometerStatus, setPedometerStatus] = useState<PermissionStatus>("unknown");
  const [healthSteps, setHealthSteps] = useState<number | null>(null);

  useEffect(() => {
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    let dailyBaseSteps = 0;
    let watcherBaseSteps: number | null = null;

    async function initPedometer() {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) {
          setPedometerStatus("unavailable");
          return;
        }
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== "granted") {
          setPedometerStatus("denied");
          return;
        }
        setPedometerStatus("granted");
        const { start, end } = getTodayRange();
        const result = await Pedometer.getStepCountAsync(start, end);
        dailyBaseSteps = result.steps;
        setHealthSteps(result.steps);
        subscription = Pedometer.watchStepCount((update) => {
          if (watcherBaseSteps === null) {
            watcherBaseSteps = update.steps;
          }
          const delta = update.steps - watcherBaseSteps;
          setHealthSteps(dailyBaseSteps + Math.max(0, delta));
        });
      } catch {
        setPedometerStatus("unavailable");
      }
    }

    initPedometer();
    return () => {
      subscription?.remove();
    };
  }, []);

  const stepsQuery = useQuery<StepsData>({
    queryKey: ["/api/stats/steps", period],
    queryFn: () => customFetch<StepsData>(`/api/stats/steps?days=${period}`),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { steps: number; goal?: number; source?: string }) => {
      const today = new Date().toISOString().slice(0, 10);
      return customFetch("/api/stats/steps", {
        method: "POST",
        body: JSON.stringify({ date: today, steps: data.steps, goal: data.goal, source: data.source ?? "manual" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats/steps"] });
      setModalVisible(false);
      setStepsInput("");
    },
    onError: () => Alert.alert("Erreur", "Impossible de sauvegarder les pas."),
  });

  function syncFromHealth() {
    if (healthSteps == null) return;
    const currentGoal = stepsQuery.data?.today?.goal ?? 10000;
    saveMutation.mutate({ steps: healthSteps, goal: currentGoal, source: "health" });
  }

  function handleSave() {
    const steps = parseInt(stepsInput, 10);
    if (Number.isNaN(steps) || steps < 0) {
      Alert.alert("Erreur", "Nombre de pas invalide.");
      return;
    }
    const goal = goalInput.trim() ? parseInt(goalInput, 10) : undefined;
    if (goal !== undefined && (Number.isNaN(goal) || goal < 1000)) {
      Alert.alert("Erreur", "Objectif invalide (min 1000).");
      return;
    }
    saveMutation.mutate({ steps, goal });
  }

  function openModal() {
    const today = stepsQuery.data?.today;
    setStepsInput(today ? String(today.steps) : healthSteps != null ? String(healthSteps) : "");
    setGoalInput(today ? String(today.goal) : "10000");
    setModalVisible(true);
  }

  const data = stepsQuery.data;
  const today = data?.today ?? null;
  const history = (data?.history ?? []).slice(0, parseInt(period));
  const goal = today?.goal ?? 10000;
  const todaySteps = today?.steps ?? 0;
  const pct = Math.min((todaySteps / goal) * 100, 100);
  const maxSteps = history.length > 0 ? Math.max(...history.map((r) => r.steps), goal) : goal;
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));

  const canSyncHealth = pedometerStatus === "granted" && healthSteps != null;

  return (
    <>
      <GlowCard glowColor={COLORS.green} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather name="activity" size={14} color={COLORS.green} />
            <Text style={[styles.title, { fontFamily: FONTS.mono }]}>PAS QUOTIDIENS</Text>
          </View>
          <TouchableOpacity onPress={openModal} style={styles.editBtn}>
            <Feather name="edit-2" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.todayRow}>
          <Text style={[styles.stepsCount, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
            {todaySteps.toLocaleString("fr-FR")}
          </Text>
          <Text style={[styles.goalText, { fontFamily: FONTS.mono }]}>
            / {goal.toLocaleString("fr-FR")} pas
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={[styles.pctText, { fontFamily: FONTS.mono }]}>
          {pct.toFixed(0)}% de l&apos;objectif
        </Text>

        {pedometerStatus === "granted" && healthSteps != null && (
          <View style={styles.healthRow}>
            <View style={styles.healthInfo}>
              <Feather name="smartphone" size={12} color={COLORS.green} />
              <Text style={[styles.healthText, { fontFamily: FONTS.mono, color: COLORS.green }]}>
                {healthSteps.toLocaleString("fr-FR")} pas détectés
              </Text>
            </View>
            {today?.source !== "health" && (
              <TouchableOpacity onPress={syncFromHealth} style={styles.syncBtn} disabled={saveMutation.isPending}>
                <Text style={[styles.syncBtnText, { fontFamily: FONTS.mono }]}>Synchroniser</Text>
              </TouchableOpacity>
            )}
            {today?.source === "health" && (
              <View style={styles.syncedBadge}>
                <Feather name="check" size={11} color={COLORS.green} />
                <Text style={[styles.syncedText, { fontFamily: FONTS.mono }]}>Synchronisé</Text>
              </View>
            )}
          </View>
        )}

        {pedometerStatus === "denied" && (
          <View style={styles.healthRow}>
            <Feather name="alert-circle" size={12} color={COLORS.amber} />
            <Text style={[styles.healthNote, { fontFamily: FONTS.body, color: COLORS.amber }]}>
              Autorisation refusée — active dans Réglages pour la synchro automatique
            </Text>
          </View>
        )}

        {(pedometerStatus === "unavailable" || pedometerStatus === "unknown") && Platform.OS !== "web" && (
          <View style={styles.healthRow}>
            <Feather name="smartphone" size={12} color={COLORS.textMuted} />
            <Text style={[styles.healthNote, { fontFamily: FONTS.body }]}>
              Saisie manuelle — synchro santé non disponible sur cet appareil
            </Text>
          </View>
        )}

        <View style={styles.periodRow}>
          {(["7", "14", "30"] as HistoryPeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            >
              <Text style={[styles.periodLabel, { fontFamily: FONTS.mono, color: period === p ? COLORS.green : COLORS.textMuted }]}>
                {p}j
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {sortedHistory.length > 0 ? (
          <View style={styles.chartContainer}>
            {sortedHistory.map((row, i) => {
              const barPct = maxSteps > 0 ? (row.steps / maxSteps) * 100 : 0;
              const isToday = row.date === new Date().toISOString().slice(0, 10);
              const dayLabel = new Date(row.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 1).toUpperCase();
              const reachedGoal = row.steps >= row.goal;
              return (
                <View key={row.id ?? i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${barPct}%`,
                          backgroundColor: reachedGoal ? COLORS.green : isToday ? COLORS.cyan : COLORS.bgElevated,
                          borderColor: reachedGoal ? COLORS.green : isToday ? COLORS.cyan : COLORS.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { fontFamily: FONTS.mono, color: isToday ? COLORS.cyan : COLORS.textMuted }]}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            Aucune donnée — enregistre tes pas du jour !
          </Text>
        )}
      </GlowCard>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modal}>
              <Text style={[styles.modalTitle, { fontFamily: FONTS.mono }]}>PAS DU JOUR</Text>
              {canSyncHealth && (
                <TouchableOpacity style={styles.healthImportBtn} onPress={() => setStepsInput(String(healthSteps))}>
                  <Feather name="smartphone" size={13} color={COLORS.green} />
                  <Text style={[styles.healthImportText, { fontFamily: FONTS.mono }]}>
                    Importer {healthSteps?.toLocaleString("fr-FR")} pas (santé)
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.modalLabel, { fontFamily: FONTS.body }]}>Nombre de pas</Text>
              <TextInput
                style={[styles.input, { fontFamily: FONTS.mono }]}
                value={stepsInput}
                onChangeText={setStepsInput}
                keyboardType="numeric"
                placeholder="ex: 8500"
                placeholderTextColor={COLORS.textMuted}
                maxLength={7}
              />
              <Text style={[styles.modalLabel, { fontFamily: FONTS.body }]}>Objectif quotidien</Text>
              <TextInput
                style={[styles.input, { fontFamily: FONTS.mono }]}
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor={COLORS.textMuted}
                maxLength={6}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.cancelText, { fontFamily: FONTS.mono }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveMutation.isPending}>
                  <Text style={[styles.saveText, { fontFamily: FONTS.mono }]}>
                    {saveMutation.isPending ? "..." : "Enregistrer"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  editBtn: { padding: 4 },
  todayRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  stepsCount: { fontSize: 36 },
  goalText: { fontSize: 13, color: COLORS.textMuted },
  progressTrack: { height: 8, backgroundColor: COLORS.bgElevated, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.green, borderRadius: 4 },
  pctText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  healthInfo: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  healthText: { fontSize: 12 },
  healthNote: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#22C55E20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  syncBtnText: { fontSize: 11, color: COLORS.green },
  syncedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncedText: { fontSize: 11, color: COLORS.green },
  periodRow: { flexDirection: "row", backgroundColor: COLORS.bgElevated, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignSelf: "flex-start", overflow: "hidden" },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  periodBtnActive: { backgroundColor: "#22C55E20" },
  periodLabel: { fontSize: 11 },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { flex: 1, width: "100%", backgroundColor: COLORS.bgElevated, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4, borderWidth: 1, minHeight: 4 },
  barLabel: { fontSize: 9, letterSpacing: 0.5 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingVertical: 16 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, width: "100%", gap: 12, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 14, color: COLORS.white, letterSpacing: 2, marginBottom: 4 },
  healthImportBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#22C55E15", borderRadius: 10, borderWidth: 1, borderColor: "#22C55E40" },
  healthImportText: { fontSize: 12, color: COLORS.green },
  modalLabel: { fontSize: 13, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: COLORS.white },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  cancelText: { fontSize: 13, color: COLORS.textMuted },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.green, alignItems: "center" },
  saveText: { fontSize: 13, color: COLORS.bg },
});
