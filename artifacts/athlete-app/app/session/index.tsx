import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useGetTodaySession, useStartSession, useGetTodayCheckin, equipmentLabelFromKey } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GradientButton } from "@/components/ui/GradientButton";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function SessionIntroScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const checkinQuery = useGetTodayCheckin();
  const startMutation = useStartSession();
  const [startError, setStartError] = React.useState("");

  useFocusEffect(
    React.useCallback(() => {
      sessionQuery.refetch();
      checkinQuery.refetch();
    }, [])
  );

  const checkin = checkinQuery.data;
  const canEditCheckin =
    checkin?.createdAt
      ? Date.now() - new Date(checkin.createdAt).getTime() < TWO_HOURS_MS
      : false;

  const handleEditCheckin = () => {
    router.push({
      pathname: "/checkin",
      params: {
        sleep: String(checkin?.sleep ?? 3),
        energy: String(checkin?.energy ?? 3),
        stress: String(checkin?.stress ?? 3),
        soreness: String(checkin?.soreness ?? 3),
        motivation: String(checkin?.motivation ?? 3),
        hasPain: checkin?.hasPain ? "1" : "0",
        painNotes: checkin?.painNotes ?? "",
        cyclePhase: checkin?.cyclePhase ?? undefined,
        edit: "1",
      },
    });
  };

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  if (sessionQuery.isPending) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Feather name="calendar" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: FONTS.title }]}>AUCUNE SÉANCE</Text>
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            Aucune séance n'est programmée pour aujourd'hui. Ton coach n'a pas encore attribué de programme.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.homeBtn}>
            <Text style={[styles.homeBtnText, { fontFamily: FONTS.bodyMedium }]}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleStart = async () => {
    setStartError("");
    try {
      await startMutation.mutateAsync({ sessionId: session.sessionLogId });
      router.push("/session/exercise");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de démarrer la séance";
      setStartError(msg);
    }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <ModeBadge mode={modeKey} size="sm" glow />
        </View>

        <View style={[styles.heroSection, { borderColor: `${cfg.color}40` }]}>
          <Text style={[styles.heroTitle, { fontFamily: FONTS.title, color: cfg.color }]}>
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
                {session.exercises?.length ?? 0} EXERCICES
              </Text>
            </View>
            {(() => {
              const isPresentiel = session.sessionLocation === "presentiel";
              const color = isPresentiel ? COLORS.amber : COLORS.cyan;
              return (
                <View style={[styles.metaChip, {
                  borderColor: `${color}40`,
                  backgroundColor: `${color}12`,
                }]}>
                  <Feather name={isPresentiel ? "map-pin" : "video"} size={12} color={color} />
                  <Text style={[styles.metaText, { fontFamily: FONTS.mono, color }]}>
                    {isPresentiel ? "PRÉSENTIEL" : "EN LIGNE"}
                  </Text>
                </View>
              );
            })()}
            {session.scheduledTime ? (
              <View style={[styles.metaChip, { borderColor: "#ffffff20", backgroundColor: "#ffffff08" }]}>
                <Feather name="clock" size={12} color={COLORS.textMuted} />
                <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                  {session.scheduledTime}
                </Text>
              </View>
            ) : null}
          </View>
          {session.visioLink && session.sessionLocation !== "presentiel" ? (
            <View style={[styles.metaChip, { borderColor: `${COLORS.cyan}30`, backgroundColor: `${COLORS.cyan}08`, marginTop: 6 }]}>
              <Feather name="link" size={12} color={COLORS.cyan} />
              <Text
                style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.cyan, flex: 1 }]}
                numberOfLines={1}
              >
                {session.visioLink}
              </Text>
            </View>
          ) : null}
          <View style={[styles.scoreRow, { backgroundColor: `${cfg.color}10`, borderColor: `${cfg.color}40` }]}>
            <Text style={[styles.scoreLabel, { fontFamily: FONTS.mono }]}>ADAPT SCORE</Text>
            <Text style={[styles.scoreVal, { fontFamily: FONTS.monoBold, color: cfg.color }]}>
              {session.adaptScore}
            </Text>
          </View>
          {canEditCheckin && (
            <TouchableOpacity onPress={handleEditCheckin} style={styles.editCheckinRow}>
              <Feather name="edit-2" size={12} color={COLORS.textMuted} />
              <Text style={[styles.editCheckinText, { fontFamily: FONTS.body }]}>
                Modifier mon check-in du jour
              </Text>
              <Feather name="chevron-right" size={12} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {(() => {
          const allEquipmentKeys = (session.exercises ?? [])
            .flatMap(ex => ((ex.equipment as string[] | null | undefined) ?? []))
            .filter(e => e !== "Aucun" && e !== "aucun" && e !== "poids-du-corps");
          const uniqueKeys = [...new Set(allEquipmentKeys)];
          const uniqueLabels = uniqueKeys.map(equipmentLabelFromKey);
          if (uniqueLabels.length === 0) return null;
          return (
            <View style={styles.equipmentCard}>
              <View style={styles.equipmentCardHeader}>
                <Feather name="package" size={14} color={COLORS.amber} />
                <Text style={[styles.equipmentCardLabel, { fontFamily: FONTS.mono }]}>
                  TU AURAS BESOIN DE
                </Text>
              </View>
              <View style={styles.equipmentTagsRow}>
                {uniqueLabels.map((label, i) => (
                  <View key={uniqueKeys[i]} style={styles.equipmentTag}>
                    <Text style={[styles.equipmentTagText, { fontFamily: FONTS.mono }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {session.coachNotes != null && (
          <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.coachIconWrap}>
                <Feather name="message-square" size={14} color={COLORS.cyan} />
              </View>
              <Text style={[styles.coachLabel, { fontFamily: FONTS.mono }]}>NOTES DU COACH</Text>
            </View>
            <Text style={[styles.coachText, { fontFamily: FONTS.body }]}>{session.coachNotes}</Text>
          </View>
        )}

        <View style={styles.exerciseList}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>PROGRAMME</Text>
          {session.exercises?.map((ex, i) => {
            return (
              <View key={ex.id} style={styles.exRow}>
                <View style={styles.exThumbFallback}>
                  <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>{ex.exerciseName}</Text>
                  <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                    {ex.sets}×{ex.reps}
                    {ex.adaptedLoadKg != null ? ` · ${ex.adaptedLoadKg}kg` : ""}
                    {ex.restSeconds != null ? ` · ${ex.restSeconds}s repos` : ""}
                  </Text>
                  {ex.coachCue != null && (
                    <Text style={[styles.exCue, { fontFamily: FONTS.body }]}>{ex.coachCue}</Text>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {startError ? (
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{startError}</Text>
        ) : null}
        {(session.exercises?.length ?? 0) === 0 ? (
          <View style={styles.noExCard}>
            <Feather name="info" size={18} color={COLORS.textMuted} />
            <Text style={[styles.noExText, { fontFamily: FONTS.body }]}>
              Cette séance n'a aucun exercice. Contacte ton coach pour la compléter.
            </Text>
          </View>
        ) : (
          <GradientButton
            label={startMutation.isPending ? "DÉMARRAGE…" : "DÉMARRER LA SÉANCE"}
            onPress={handleStart}
            loading={startMutation.isPending}
            icon={<Feather name="play" size={18} color={COLORS.textInverse} />}
          />
        )}
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
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scoreLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5 },
  scoreVal: { fontSize: 24 },
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
  noExCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noExText: { flex: 1, fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 28,
  },
  editCheckinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  editCheckinText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 36, color: COLORS.white, letterSpacing: 4 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
  homeBtn: {
    marginTop: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: { fontSize: 15, color: COLORS.white },
  equipmentCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.amber}30`,
    padding: 16,
    gap: 12,
  },
  equipmentCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  equipmentCardLabel: { fontSize: 10, color: COLORS.amber, letterSpacing: 2 },
  equipmentTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipmentTag: {
    backgroundColor: `${COLORS.amber}10`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${COLORS.amber}30`,
  },
  equipmentTagText: { fontSize: 12, color: COLORS.amber, letterSpacing: 0.3 },
});
