import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useSubmitSessionFeedback } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";

type FeatherIconName = keyof typeof Feather.glyphMap;
type Difficulty = "too_easy" | "well_calibrated" | "too_hard";

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; icon: FeatherIconName; color: string }[] = [
  { key: "too_easy", label: "Trop facile", icon: "thumbs-up", color: COLORS.cyan },
  { key: "well_calibrated", label: "Parfait", icon: "check-circle", color: COLORS.green },
  { key: "too_hard", label: "Trop dur", icon: "alert-triangle", color: COLORS.red },
];

function getRPEColor(rpe: number): string {
  if (rpe <= 4) return COLORS.green;
  if (rpe <= 7) return COLORS.cyan;
  return COLORS.red;
}

export default function RateSessionScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { sessionLogId, sessionName } = useLocalSearchParams<{ sessionLogId: string; sessionName?: string }>();
  const feedbackMutation = useSubmitSessionFeedback();

  const [rpe, setRpe] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("well_calibrated");
  const [notes, setNotes] = useState("");

  const rpeColor = getRPEColor(rpe);

  const handleSubmit = async () => {
    if (!sessionLogId) {
      router.back();
      return;
    }
    try {
      await feedbackMutation.mutateAsync({
        sessionId: sessionLogId,
        data: { rpe, perceivedDifficulty: difficulty, athleteNotes: notes.trim() || null, theme: null },
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today-all"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Merci !", "Ton ressenti a été enregistré.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer le ressenti. Réessaie plus tard.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: FONTS.bodyBold }]}>Évaluer ma séance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sessionName ? (
          <View style={styles.sessionNameCard}>
            <Feather name="activity" size={18} color={COLORS.cyan} />
            <Text style={[styles.sessionNameText, { fontFamily: FONTS.bodyMedium }]}>
              {sessionName}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="star" size={16} color={COLORS.amber} />
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color: COLORS.amber }]}>
              MON RESSENTI
            </Text>
          </View>

          <Text style={[styles.rpeLabel, { fontFamily: FONTS.body }]}>
            Effort ressenti (RPE){" "}
            <Text style={[styles.rpeBig, { fontFamily: FONTS.monoBold, color: rpeColor }]}>
              {rpe}/10
            </Text>
          </Text>
          <View style={styles.rpeRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRpe(v); }}
                style={[
                  styles.rpeBtn,
                  { backgroundColor: rpe >= v ? `${getRPEColor(v)}30` : COLORS.border },
                  rpe === v && { borderColor: getRPEColor(v), borderWidth: 1.5 },
                ]}
              >
                <Text style={[styles.rpeBtnText, { fontFamily: FONTS.mono, color: rpe >= v ? getRPEColor(v) : COLORS.textMuted }]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.diffRow}>
            {DIFFICULTY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setDifficulty(opt.key)}
                style={[
                  styles.diffChip,
                  difficulty === opt.key && { backgroundColor: `${opt.color}20`, borderColor: opt.color },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={13}
                  color={difficulty === opt.key ? opt.color : COLORS.textMuted}
                />
                <Text style={[
                  styles.diffLabel,
                  { fontFamily: FONTS.body, color: difficulty === opt.key ? opt.color : COLORS.textMuted },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.notesInput, { fontFamily: FONTS.body }]}
            placeholder="Commentaire libre (optionnel)..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.actions}>
          <GradientButton
            label={feedbackMutation.isPending ? "Enregistrement..." : "Enregistrer mon ressenti"}
            onPress={handleSubmit}
            icon={<Feather name="check" size={18} color={COLORS.textInverse} />}
          />
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { fontFamily: FONTS.body }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, color: COLORS.white },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  sessionNameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionNameText: { fontSize: 15, color: COLORS.white, flex: 1 },
  section: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  rpeLabel: { fontSize: 13, color: COLORS.textSecondary },
  rpeBig: { fontSize: 15 },
  rpeRow: { flexDirection: "row", gap: 4, justifyContent: "center", flexWrap: "wrap" },
  rpeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rpeBtnText: { fontSize: 12 },
  diffRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  diffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  diffLabel: { fontSize: 12 },
  notesInput: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.white,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actions: { gap: 12, alignItems: "center" },
  cancelBtn: { padding: 12 },
  cancelBtnText: { fontSize: 14, color: COLORS.textMuted },
});
