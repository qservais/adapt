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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useGetTodaySession, useSubmitSessionFeedback } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { AdaptSlider } from "@/components/ui/AdaptSlider";

type Difficulty = "too_easy" | "well_calibrated" | "too_hard";

const DIFFICULTY_OPTIONS = [
  { key: "too_easy" as Difficulty, label: "Trop facile", icon: "thumbs-up" as const, color: COLORS.cyan },
  { key: "well_calibrated" as Difficulty, label: "Parfait", icon: "check-circle" as const, color: COLORS.green },
  { key: "too_hard" as Difficulty, label: "Trop dur", icon: "alert-triangle" as const, color: COLORS.red },
];

function getRPEColor(rpe: number): string {
  if (rpe <= 4) return COLORS.green;
  if (rpe <= 7) return COLORS.cyan;
  return COLORS.red;
}

function getRPELabel(rpe: number): string {
  if (rpe <= 2) return "Très facile";
  if (rpe <= 4) return "Facile";
  if (rpe <= 6) return "Modéré";
  if (rpe <= 8) return "Difficile";
  if (rpe <= 9) return "Très difficile";
  return "Effort maximal";
}

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sessionQuery = useGetTodaySession();
  const feedbackMutation = useSubmitSessionFeedback();

  const session = sessionQuery.data;

  const [rpe, setRpe] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("well_calibrated");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const rpeColor = getRPEColor(rpe);

  const handleSubmit = async () => {
    setSubmitError("");
    if (session?.sessionLogId == null) {
      router.replace("/");
      return;
    }
    try {
      await feedbackMutation.mutateAsync({
        sessionId: session.sessionLogId,
        data: {
          rpe,
          perceivedDifficulty: difficulty,
          athleteNotes: notes.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions/today"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/checkins/today"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible d'envoyer le retour";
      setSubmitError(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>RETOUR DE SÉANCE</Text>
        <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
          Aide ADAPT à calibrer tes prochaines séances.
        </Text>

        <View style={[styles.card, { borderColor: `${rpeColor}30` }]}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            EFFORT RESSENTI (RPE)
          </Text>
          <View style={styles.rpeDisplay}>
            <Text style={[styles.rpeVal, { fontFamily: FONTS.monoBold, color: rpeColor }]}>
              {rpe}
            </Text>
            <Text style={[styles.rpeMax, { fontFamily: FONTS.mono }]}>/10</Text>
          </View>
          <Text style={[styles.rpeLabel, { fontFamily: FONTS.bodyMedium, color: rpeColor }]}>
            {getRPELabel(rpe)}
          </Text>
          <View style={{ marginTop: 16, width: "100%" }}>
            <AdaptSlider
              value={rpe}
              min={1}
              max={10}
              step={1}
              onChange={(v) => {
                Haptics.selectionAsync();
                setRpe(v);
              }}
              activeColor={rpeColor}
              showTicks={false}
            />
            <View style={styles.rpeEndLabels}>
              <Text style={[styles.rpeEndText, { fontFamily: FONTS.mono }]}>Facile</Text>
              <Text style={[styles.rpeEndText, { fontFamily: FONTS.mono }]}>Effort max</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>CALIBRATION</Text>
          <View style={styles.calibRow}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDifficulty(opt.key);
                }}
                style={[
                  styles.calibBtn,
                  difficulty === opt.key && {
                    borderColor: opt.color,
                    backgroundColor: `${opt.color}15`,
                  },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={24}
                  color={difficulty === opt.key ? opt.color : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.calibLabel,
                    { fontFamily: FONTS.bodyMedium },
                    difficulty === opt.key && { color: opt.color },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>NOTES (OPTIONNEL)</Text>
          <TextInput
            style={[styles.notesInput, { fontFamily: FONTS.body }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Comment ça s'est passé ? Quelque chose à noter ?"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {submitError ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{submitError}</Text>
          </View>
        ) : null}

        <GradientButton
          label="Envoyer le retour"
          onPress={handleSubmit}
          loading={feedbackMutation.isPending}
        />

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.skipBtn}>
          <Text style={[styles.skipText, { fontFamily: FONTS.body }]}>Passer</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 40, color: COLORS.white, letterSpacing: 4 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  rpeDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  rpeVal: { fontSize: 64, lineHeight: 72 },
  rpeMax: { fontSize: 24, color: COLORS.textMuted, marginBottom: 8 },
  rpeLabel: { fontSize: 16, textAlign: "center" },
  rpeEndLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  rpeEndText: { fontSize: 11, color: COLORS.textMuted },
  calibRow: { flexDirection: "row", gap: 8 },
  calibBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  calibLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
  notesInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorWrap: {
    backgroundColor: COLORS.redDim,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  skipBtn: { alignItems: "center", paddingVertical: 12 },
  skipText: { fontSize: 14, color: COLORS.textMuted },
});
