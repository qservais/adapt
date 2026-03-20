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
import { useGetTodaySession, useSubmitSessionFeedback } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/Button";

type Difficulty = "too_easy" | "well_calibrated" | "too_hard";

interface DifficultyOption {
  key: Difficulty;
  label: string;
  icon: "thumbs-up" | "check-circle" | "alert-triangle";
  color: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { key: "too_easy", label: "Trop facile", icon: "thumbs-up", color: COLORS.cyan },
  { key: "well_calibrated", label: "Parfait", icon: "check-circle", color: COLORS.green },
  { key: "too_hard", label: "Trop dur", icon: "alert-triangle", color: COLORS.red },
];

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const sessionQuery = useGetTodaySession();
  const feedbackMutation = useSubmitSessionFeedback();

  const session = sessionQuery.data;
  const modeKey = (session?.mode ?? "normal") as SessionMode;

  const [rpe, setRpe] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("well_calibrated");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const rpeColor = rpe <= 4 ? COLORS.cyan : rpe <= 7 ? COLORS.green : rpe <= 9 ? COLORS.amber : COLORS.red;

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

        <GlowCard glowColor={rpeColor} style={styles.rpeCard}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            EFFORT RESSENTI (RPE)
          </Text>
          <View style={styles.rpeDisplay}>
            <Text style={[styles.rpeVal, { fontFamily: FONTS.monoBold, color: rpeColor }]}>
              {rpe}
            </Text>
            <Text style={[styles.rpeMax, { fontFamily: FONTS.mono }]}>/10</Text>
          </View>
          <View style={styles.rpeButtons}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => {
              const btnColor =
                v <= 4 ? COLORS.cyan : v <= 7 ? COLORS.green : v <= 9 ? COLORS.amber : COLORS.red;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => setRpe(v)}
                  style={[
                    styles.rpeBtn,
                    v === rpe && { backgroundColor: btnColor, borderColor: btnColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.rpeBtnText,
                      { fontFamily: FONTS.mono },
                      v === rpe && { color: COLORS.bg },
                    ]}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.rpeLabels}>
            <Text style={[styles.rpeLabelText, { fontFamily: FONTS.body }]}>Facile</Text>
            <Text style={[styles.rpeLabelText, { fontFamily: FONTS.body }]}>Effort max</Text>
          </View>
        </GlowCard>

        <GlowCard glowColor={COLORS.border} style={styles.calibCard}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            CALIBRATION
          </Text>
          <View style={styles.calibRow}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setDifficulty(opt.key)}
                style={[
                  styles.calibBtn,
                  difficulty === opt.key && {
                    borderColor: opt.color,
                    backgroundColor: `${opt.color}20`,
                  },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={22}
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
        </GlowCard>

        <GlowCard glowColor={COLORS.border} style={styles.notesCard}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            NOTES (OPTIONNEL)
          </Text>
          <TextInput
            style={[styles.notesInput, { fontFamily: FONTS.body }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Comment ça s'est passé ? Quelque chose à noter ?"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
          />
        </GlowCard>

        {submitError ? (
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{submitError}</Text>
        ) : null}
        <Button
          label="Envoyer le retour"
          onPress={handleSubmit}
          loading={feedbackMutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 40, color: COLORS.white, letterSpacing: 4 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 16 },
  rpeCard: { gap: 0 },
  rpeDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: 20,
    gap: 4,
  },
  rpeVal: { fontSize: 56 },
  rpeMax: { fontSize: 22, color: COLORS.textMuted, marginBottom: 10 },
  rpeButtons: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  rpeBtn: {
    flex: 1,
    minWidth: "8%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  rpeBtnText: { fontSize: 14, color: COLORS.textSecondary },
  rpeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rpeLabelText: { fontSize: 11, color: COLORS.textMuted },
  calibCard: { gap: 0 },
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
  calibLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
  notesCard: { gap: 0 },
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
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
});
