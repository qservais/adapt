import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetChallenge, useUpdateChallengeProgress } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";

const METRIC_FR: Record<string, string> = {
  reps: "répétitions",
  distance: "km",
  time: "minutes",
  sessions: "séances",
};

function daysRemaining(endDate: string) {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return diff;
}

function progressPercent(progress: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(1, progress / target);
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const challengeQuery = useGetChallenge(id ?? "");
  const updateMutation = useUpdateChallengeProgress();
  const [inputValue, setInputValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const challenge = challengeQuery.data;

  const handleUpdate = async () => {
    if (!challenge || !id) return;
    const newValue = parseFloat(inputValue);
    if (isNaN(newValue) || newValue < 0) {
      Alert.alert("Valeur invalide", "Entrez un nombre positif.");
      return;
    }
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({ id, data: { progress: newValue } });
      setInputValue("");
      await challengeQuery.refetch();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour la progression.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (challengeQuery.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.amber} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.bg }]}>
        <Feather name="alert-circle" size={40} color={COLORS.textMuted} />
        <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>Challenge introuvable</Text>
      </View>
    );
  }

  const pct = progressPercent(challenge.progress, challenge.target);
  const days = daysRemaining(challenge.endDate);
  const isCompleted = challenge.completedAt != null;
  const unit = challenge.unit ?? METRIC_FR[challenge.metric] ?? challenge.metric;
  const accentColor = isCompleted ? COLORS.green : COLORS.amber;

  const startDateFR = new Date(challenge.startDate + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const endDateFR = new Date(challenge.endDate + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, { borderColor: `${accentColor}30` }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
            {isCompleted ? (
              <Feather name="check-circle" size={28} color={accentColor} />
            ) : (
              <Feather name="zap" size={28} color={accentColor} />
            )}
          </View>

          <Text style={[styles.statusLabel, { fontFamily: FONTS.mono, color: accentColor }]}>
            {isCompleted ? "CHALLENGE COMPLÉTÉ" : "CHALLENGE EN COURS"}
          </Text>

          <Text style={[styles.title, { fontFamily: FONTS.title, color: COLORS.white }]}>
            {challenge.title}
          </Text>

          {challenge.description != null && (
            <Text style={[styles.description, { fontFamily: FONTS.body }]}>
              {challenge.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={13} color={COLORS.textMuted} />
              <Text style={[styles.metaText, { fontFamily: FONTS.mono }]}>
                {startDateFR} → {endDateFR}
              </Text>
            </View>
            {!isCompleted && days > 0 && (
              <View style={[styles.daysBadge, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}12` }]}>
                <Text style={[styles.daysBadgeText, { fontFamily: FONTS.mono, color: accentColor }]}>
                  {days} J. RESTANT{days > 1 ? "S" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono }]}>PROGRESSION</Text>
          <View style={styles.progressNumbers}>
            <Text style={[styles.progressCurrent, { fontFamily: FONTS.monoBold, color: accentColor }]}>
              {challenge.progress}
            </Text>
            <Text style={[styles.progressSeparator, { fontFamily: FONTS.mono }]}>/</Text>
            <Text style={[styles.progressTarget, { fontFamily: FONTS.monoBold }]}>
              {challenge.target}
            </Text>
            <Text style={[styles.progressUnit, { fontFamily: FONTS.body }]}>{unit}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: accentColor }]} />
          </View>
          <Text style={[styles.progressPctText, { fontFamily: FONTS.mono, color: accentColor }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>

        <View style={styles.updateCard}>
            <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono }]}>
              {isCompleted ? "CORRIGER MA PROGRESSION" : "METTRE À JOUR"}
            </Text>
            <Text style={[styles.updateDesc, { fontFamily: FONTS.body }]}>
              {isCompleted
                ? `Corrige la valeur si besoin (en ${unit}).`
                : `Entre ta progression totale actuelle en ${unit}.`}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { fontFamily: FONTS.mono, color: COLORS.white }]}
                placeholder={`Ex. : ${Math.round(challenge.progress + challenge.target * 0.1)}`}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={inputValue}
                onChangeText={setInputValue}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.updateBtn, { backgroundColor: accentColor, opacity: isUpdating || !inputValue ? 0.5 : 1 }]}
                onPress={handleUpdate}
                disabled={isUpdating || !inputValue}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={[styles.updateBtnText, { fontFamily: FONTS.bodyBold }]}>Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

        {isCompleted && (
          <View style={[styles.completedBanner, { borderColor: `${COLORS.green}40`, backgroundColor: `${COLORS.green}10` }]}>
            <Feather name="award" size={22} color={COLORS.green} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.completedTitle, { fontFamily: FONTS.bodyBold, color: COLORS.green }]}>
                Défi relevé !
              </Text>
              <Text style={[styles.completedDesc, { fontFamily: FONTS.body }]}>
                Bravo, tu as complété ce challenge avec succès.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, color: COLORS.textMuted },
  content: { paddingHorizontal: 20, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    alignItems: "center",
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 34,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  daysBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  daysBadgeText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  progressCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  progressNumbers: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  progressCurrent: {
    fontSize: 36,
    lineHeight: 40,
  },
  progressSeparator: {
    fontSize: 24,
    color: COLORS.textMuted,
    lineHeight: 40,
  },
  progressTarget: {
    fontSize: 24,
    color: COLORS.textSecondary,
    lineHeight: 40,
  },
  progressUnit: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 40,
    marginLeft: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bgElevated,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPctText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: "right",
  },
  updateCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 10,
  },
  updateDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  updateBtnText: {
    fontSize: 14,
    color: COLORS.bg,
  },
  completedBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  completedTitle: {
    fontSize: 15,
    marginBottom: 3,
  },
  completedDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
