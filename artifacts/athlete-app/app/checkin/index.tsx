import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { useSubmitCheckin, useGetMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { CustomSlider } from "@/components/ui/CustomSlider";
import { Button } from "@/components/ui/Button";

type IconName = "sun" | "zap" | "activity" | "thermometer" | "target" | "alert-triangle";

interface SliderStep {
  kind: "slider";
  key: "sleep" | "energy" | "stress" | "soreness" | "motivation";
  title: string;
  subtitle: string;
  icon: IconName;
  lowLabel: string;
  highLabel: string;
}

interface PainStep {
  kind: "pain";
  key: "pain";
  title: string;
  subtitle: string;
  icon: IconName;
}

interface CycleStep {
  kind: "cycle";
  key: "cycle";
  title: string;
  subtitle: string;
  icon: IconName;
}

interface WelcomeStep {
  kind: "welcome";
  key: "welcome";
  title: string;
  subtitle: string;
  icon: IconName;
}

type Step = WelcomeStep | SliderStep | CycleStep | PainStep;

const ALL_STEPS: Step[] = [
  {
    kind: "welcome",
    key: "welcome",
    title: "BONJOUR",
    subtitle: "Let's calibrate today's session. This takes less than a minute.",
    icon: "sun",
  },
  {
    kind: "slider",
    key: "sleep",
    title: "SOMMEIL",
    subtitle: "How did you sleep last night?",
    icon: "sun",
    lowLabel: "Terrible",
    highLabel: "Amazing",
  },
  {
    kind: "slider",
    key: "energy",
    title: "ÉNERGIE",
    subtitle: "How energized do you feel right now?",
    icon: "zap",
    lowLabel: "Exhausted",
    highLabel: "Energized",
  },
  {
    kind: "slider",
    key: "stress",
    title: "STRESS",
    subtitle: "Rate your current stress level",
    icon: "activity",
    lowLabel: "Very stressed",
    highLabel: "Relaxed",
  },
  {
    kind: "slider",
    key: "soreness",
    title: "COURBATURES",
    subtitle: "How sore are your muscles?",
    icon: "thermometer",
    lowLabel: "Very sore",
    highLabel: "No soreness",
  },
  {
    kind: "slider",
    key: "motivation",
    title: "MOTIVATION",
    subtitle: "How motivated are you to train?",
    icon: "target",
    lowLabel: "Not at all",
    highLabel: "Pumped",
  },
  {
    kind: "cycle",
    key: "cycle",
    title: "CYCLE",
    subtitle: "Where are you in your cycle today? (optional)",
    icon: "activity",
  },
  {
    kind: "pain",
    key: "pain",
    title: "DOULEUR",
    subtitle: "Any pain or discomfort today?",
    icon: "alert-triangle",
  },
];

const CYCLE_PHASES = [
  { key: "menstrual", label: "Menstrual", desc: "Days 1–5", color: COLORS.red },
  { key: "follicular", label: "Follicular", desc: "Days 6–13", color: COLORS.cyan },
  { key: "ovulatory", label: "Ovulation", desc: "Day 14", color: COLORS.green },
  { key: "luteal", label: "Luteal", desc: "Days 15–28", color: COLORS.amber },
] as const;

type CyclePhase = (typeof CYCLE_PHASES)[number]["key"] | null;

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const meQuery = useGetMe();
  const submitMutation = useSubmitCheckin();

  const hasCycleTracking = meQuery.data?.cycleTracking ?? false;
  const steps = hasCycleTracking
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => s.kind !== "cycle");

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState({
    sleep: 3,
    energy: 3,
    stress: 3,
    soreness: 3,
    motivation: 3,
  });
  const [hasPain, setHasPain] = useState(false);
  const [painNotes, setPainNotes] = useState("");
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>(null);

  const isLastStep = stepIndex === steps.length - 1;
  const currentStep = steps[stepIndex];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      try {
        const result = await submitMutation.mutateAsync({
          data: {
            ...values,
            hasPain,
            painNotes: hasPain ? painNotes : null,
            cyclePhase: cyclePhase ?? undefined,
          },
        });
        router.replace({
          pathname: "/checkin/result",
          params: {
            score: String(result.checkin.adaptScore),
            mode: result.checkin.sessionMode,
          },
        });
      } catch (err: unknown) {
        const code =
          err !== null &&
          typeof err === "object" &&
          "code" in err &&
          typeof (err as Record<string, unknown>).code === "string"
            ? (err as Record<string, string>).code
            : "";
        if (code === "CHECKIN_CONFLICT") {
          router.replace("/checkin/result");
          return;
        }
        router.replace("/");
      }
      return;
    }
    setStepIndex((s) => s + 1);
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setStepIndex((s) => s - 1);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </Pressable>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((stepIndex + 1) / steps.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.stepCount, { fontFamily: FONTS.mono }]}>
          {stepIndex + 1}/{steps.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              { borderColor: COLORS.green, backgroundColor: COLORS.greenDim },
            ]}
          >
            <Feather name={currentStep.icon} size={40} color={COLORS.green} />
          </View>
        </View>

        <Text style={[styles.title, { fontFamily: FONTS.title }]}>
          {currentStep.title}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
          {currentStep.subtitle}
        </Text>

        {currentStep.kind === "welcome" && (
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeGrid}>
              {(["sleep", "energy", "stress", "soreness", "motivation"] as const).map(
                (key) => (
                  <View key={key} style={styles.welcomeItem}>
                    <Feather name="check" size={14} color={COLORS.green} />
                    <Text style={[styles.welcomeLabel, { fontFamily: FONTS.body }]}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}

        {currentStep.kind === "slider" && (
          <View style={styles.sliderSection}>
            <View style={styles.sliderLabelRow}>
              <Text style={[styles.sliderLabelText, { fontFamily: FONTS.body }]}>
                {currentStep.lowLabel}
              </Text>
              <Text style={[styles.sliderLabelText, { fontFamily: FONTS.body }]}>
                {currentStep.highLabel}
              </Text>
            </View>
            <CustomSlider
              value={values[currentStep.key]}
              min={1}
              max={5}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [currentStep.key]: v }))
              }
            />
          </View>
        )}

        {currentStep.kind === "cycle" && (
          <View style={styles.cycleSection}>
            {CYCLE_PHASES.map((phase) => {
              const isActive = cyclePhase === phase.key;
              return (
                <TouchableOpacity
                  key={phase.key}
                  onPress={() =>
                    setCyclePhase((prev) => (prev === phase.key ? null : phase.key))
                  }
                  style={[
                    styles.cycleBtn,
                    isActive && { borderColor: phase.color, backgroundColor: `${phase.color}20` },
                  ]}
                >
                  <View
                    style={[
                      styles.cycleDot,
                      { backgroundColor: isActive ? phase.color : COLORS.border },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.cycleLabel,
                        { fontFamily: FONTS.bodyMedium },
                        isActive && { color: phase.color },
                      ]}
                    >
                      {phase.label}
                    </Text>
                    <Text style={[styles.cycleDesc, { fontFamily: FONTS.mono }]}>
                      {phase.desc}
                    </Text>
                  </View>
                  {isActive && <Feather name="check" size={18} color={phase.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {currentStep.kind === "pain" && (
          <View style={styles.painSection}>
            <View style={styles.painOptions}>
              {(
                [
                  { label: "No pain", value: false, icon: "check-circle" as const, color: COLORS.green },
                  { label: "Yes, I have pain", value: true, icon: "alert-circle" as const, color: COLORS.red },
                ] as const
              ).map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHasPain(opt.value);
                  }}
                  style={[
                    styles.painOpt,
                    hasPain === opt.value && {
                      borderColor: opt.color,
                      backgroundColor: `${opt.color}20`,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={24}
                    color={hasPain === opt.value ? opt.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.painOptLabel,
                      { fontFamily: FONTS.bodyMedium },
                      hasPain === opt.value && { color: opt.color },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {hasPain && (
              <TextInput
                style={[styles.painInput, { fontFamily: FONTS.body }]}
                value={painNotes}
                onChangeText={setPainNotes}
                placeholder="Describe the pain location and intensity..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            )}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Button
          label={isLastStep ? "Submit" : "Next"}
          onPress={handleNext}
          loading={submitMutation.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: { padding: 4 },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  stepCount: { fontSize: 12, color: COLORS.textMuted, minWidth: 30, textAlign: "right" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 0,
  },
  iconWrap: { marginTop: 40, marginBottom: 28 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 52,
    color: COLORS.white,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 48,
  },
  welcomeSection: { width: "100%", alignItems: "center" },
  welcomeGrid: { gap: 12, width: "100%" },
  welcomeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeLabel: { fontSize: 15, color: COLORS.textSecondary, textTransform: "capitalize" },
  sliderSection: {
    width: "100%",
    gap: 16,
  },
  sliderLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sliderLabelText: { fontSize: 12, color: COLORS.textMuted },
  cycleSection: { width: "100%", gap: 10 },
  cycleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cycleDot: { width: 12, height: 12, borderRadius: 6 },
  cycleLabel: { fontSize: 15, color: COLORS.white, marginBottom: 2 },
  cycleDesc: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  painSection: { width: "100%", gap: 16 },
  painOptions: { flexDirection: "row", gap: 12 },
  painOpt: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  painOptLabel: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
  painInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
