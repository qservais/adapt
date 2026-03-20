import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSubmitCheckin } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { CustomSlider } from "@/components/ui/CustomSlider";
import { Button } from "@/components/ui/Button";

const STEPS = [
  {
    key: "sleep",
    title: "SOMMEIL",
    subtitle: "How did you sleep last night?",
    icon: "moon" as const,
    lowLabel: "Terrible",
    highLabel: "Amazing",
  },
  {
    key: "energy",
    title: "ÉNERGIE",
    subtitle: "How energized do you feel right now?",
    icon: "zap" as const,
    lowLabel: "Exhausted",
    highLabel: "Energized",
  },
  {
    key: "stress",
    title: "STRESS",
    subtitle: "Rate your current stress level",
    icon: "activity" as const,
    lowLabel: "Very stressed",
    highLabel: "Relaxed",
  },
  {
    key: "soreness",
    title: "COURBATURES",
    subtitle: "How sore are your muscles?",
    icon: "thermometer" as const,
    lowLabel: "Very sore",
    highLabel: "No soreness",
  },
  {
    key: "motivation",
    title: "MOTIVATION",
    subtitle: "How motivated are you to train?",
    icon: "target" as const,
    lowLabel: "Not at all",
    highLabel: "Pumped",
  },
  {
    key: "pain",
    title: "DOULEUR",
    subtitle: "Any pain or discomfort today?",
    icon: "alert-triangle" as const,
    lowLabel: null,
    highLabel: null,
  },
];

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const submitMutation = useSubmitCheckin();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    sleep: 3,
    energy: 3,
    stress: 3,
    soreness: 3,
    motivation: 3,
  });
  const [hasPain, setHasPain] = useState(false);
  const [painNotes, setPainNotes] = useState("");

  const isLastStep = step === STEPS.length - 1;
  const isPainStep = STEPS[step].key === "pain";
  const currentStep = STEPS[step];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      try {
        const result = await submitMutation.mutateAsync({
          data: {
            ...values,
            hasPain,
            painNotes: hasPain ? painNotes : null,
          },
        });
        router.replace({
          pathname: "/checkin/result" as any,
          params: {
            score: String(result.checkin.adaptScore),
            mode: result.checkin.sessionMode,
          },
        });
      } catch (e: any) {
        const code = e?.code;
        if (code === "CHECKIN_CONFLICT") {
          router.replace("/checkin/result" as any);
          return;
        }
        router.replace("/(tabs)/" as any);
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
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
              { width: `${((step + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.stepCount, { fontFamily: FONTS.mono }]}>
          {step + 1}/{STEPS.length}
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

        {isPainStep ? (
          <View style={styles.painSection}>
            <View style={styles.painOptions}>
              {[
                { label: "No pain", value: false, icon: "check-circle" as const, color: COLORS.green },
                { label: "Yes, I have pain", value: true, icon: "alert-circle" as const, color: COLORS.red },
              ].map((opt) => (
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
        ) : (
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
              value={values[currentStep.key as keyof typeof values]}
              min={1}
              max={5}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [currentStep.key]: v }))
              }
            />
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
