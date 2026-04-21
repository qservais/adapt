import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WebView } from "react-native-webview";
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

export default function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isStarting, setIsStarting] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const { data: exercise, isLoading, error } = useQuery<ExerciseDetail>({
    queryKey: ["/api/athlete/exercises", params.id],
    queryFn: () => customFetch(`/api/athlete/exercises/${params.id}`),
    enabled: params.id != null,
  });

  const handleDoNow = async () => {
    if (isStarting || !exercise) return;
    setIsStarting(true);
    try {
      const data = await customFetch(`/api/athlete/exercises/${exercise.id}/do-now`, {
        method: "POST",
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
                {exercise.history.map((entry, idx) => (
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
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {exercise != null && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            onPress={handleDoNow}
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
});
