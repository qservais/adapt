import React, { useState } from "react";
import {
  Alert,
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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSubmitCheckin, useGetMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { ProgressBar } from "@/components/ui/ProgressBar";

type IconName = "sun" | "zap" | "activity" | "thermometer" | "target" | "alert-triangle";

interface SliderStep {
  kind: "slider";
  key: "sleep" | "energy" | "stress" | "soreness" | "motivation";
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  labels: [string, string, string, string, string];
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
    subtitle: "Calibrons ta séance d'aujourd'hui. Ça prend moins d'une minute.",
    icon: "sun",
  },
  {
    kind: "slider",
    key: "sleep",
    title: "SOMMEIL",
    subtitle: "Comment as-tu dormi cette nuit ?",
    icon: "sun",
    color: COLORS.cyan,
    labels: ["Très mal", "Mal", "Correct", "Bien", "Excellent"],
  },
  {
    kind: "slider",
    key: "energy",
    title: "ÉNERGIE",
    subtitle: "Quel est ton niveau d'énergie en ce moment ?",
    icon: "zap",
    color: COLORS.green,
    labels: ["Épuisé", "Fatigué", "Neutre", "Bien", "Au top"],
  },
  {
    kind: "slider",
    key: "stress",
    title: "STRESS",
    subtitle: "Quel est ton niveau de stress actuel ?",
    icon: "activity",
    color: COLORS.amber,
    labels: ["Très stressé", "Stressé", "Neutre", "Calme", "Très calme"],
  },
  {
    kind: "slider",
    key: "soreness",
    title: "COURBATURES",
    subtitle: "As-tu des douleurs ou courbatures musculaires ?",
    icon: "thermometer",
    color: COLORS.red,
    labels: ["Très douloureux", "Douloureux", "Moyen", "Peu", "Aucun"],
  },
  {
    kind: "slider",
    key: "motivation",
    title: "MOTIVATION",
    subtitle: "À quel point es-tu motivé(e) pour t'entraîner ?",
    icon: "target",
    color: COLORS.violet,
    labels: ["Aucune", "Faible", "Correcte", "Élevée", "Extrême"],
  },
  {
    kind: "cycle",
    key: "cycle",
    title: "CYCLE",
    subtitle: "Où en es-tu dans ton cycle ? (optionnel)",
    icon: "activity",
  },
  {
    kind: "pain",
    key: "pain",
    title: "DOULEUR",
    subtitle: "As-tu une douleur ou gêne particulière aujourd'hui ?",
    icon: "alert-triangle",
  },
];

const CYCLE_PHASES = [
  { key: "menstrual", label: "Menstruelle", desc: "Jours 1–5", color: COLORS.red },
  { key: "follicular", label: "Folliculaire", desc: "Jours 6–13", color: COLORS.cyan },
  { key: "ovulatory", label: "Ovulation", desc: "Jour 14", color: COLORS.green },
  { key: "luteal", label: "Lutéale", desc: "Jours 15–28", color: COLORS.amber },
] as const;

type CyclePhase = (typeof CYCLE_PHASES)[number]["key"] | null;

const WELCOME_ITEMS = [
  { key: "sleep", label: "Sommeil", icon: "sun" as const, color: COLORS.cyan },
  { key: "energy", label: "Énergie", icon: "zap" as const, color: COLORS.green },
  { key: "stress", label: "Stress", icon: "activity" as const, color: COLORS.amber },
  { key: "soreness", label: "Courbatures", icon: "thermometer" as const, color: COLORS.red },
  { key: "motivation", label: "Motivation", icon: "target" as const, color: COLORS.violet },
];

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const meQuery = useGetMe();
  const submitMutation = useSubmitCheckin();

  const params = useLocalSearchParams<{
    sleep?: string;
    energy?: string;
    stress?: string;
    soreness?: string;
    motivation?: string;
    hasPain?: string;
    painNotes?: string;
    cyclePhase?: string;
    edit?: string;
  }>();

  const isEditMode = params.edit === "1";

  const gender = meQuery.data?.gender;
  const hasCycleTracking =
    meQuery.data?.cycleTracking === true && gender !== "homme";
  const allSteps = hasCycleTracking
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => s.kind !== "cycle");
  const steps = isEditMode ? allSteps.filter((s) => s.kind !== "welcome") : allSteps;

  const parseNum = (v: string | undefined, fallback: number) => {
    const n = parseInt(v ?? "", 10);
    return isNaN(n) ? fallback : n;
  };

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState({
    sleep: parseNum(params.sleep, 3),
    energy: parseNum(params.energy, 3),
    stress: parseNum(params.stress, 3),
    soreness: parseNum(params.soreness, 3),
    motivation: parseNum(params.motivation, 3),
  });
  const [hasPain, setHasPain] = useState(params.hasPain === "1");
  const [painNotes, setPainNotes] = useState(params.painNotes ?? "");
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>(
    (params.cyclePhase || null) as CyclePhase
  );

  const isLastStep = stepIndex === steps.length - 1;
  const currentStep = steps[stepIndex];
  const currentColor = currentStep.kind === "slider" ? currentStep.color : COLORS.cyan;

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
        const badges = result.newBadges ?? [];
        router.replace({
          pathname: "/checkin/result",
          params: {
            score: String(result.checkin.adaptScore),
            mode: result.checkin.sessionMode,
            badges: badges.length > 0 ? JSON.stringify(badges) : "",
            createdAt: result.checkin.createdAt ?? new Date().toISOString(),
            sleep: String(values.sleep),
            energy: String(values.energy),
            stress: String(values.stress),
            soreness: String(values.soreness),
            motivation: String(values.motivation),
            hasPainParam: hasPain ? "1" : "0",
            painNotes: hasPain ? painNotes : "",
            cyclePhase: cyclePhase ?? undefined,
          },
        });
      } catch (err: unknown) {
        const anyErr = err as Record<string, unknown>;
        const errBody = anyErr?.data as Record<string, unknown> | null | undefined;
        const errObj = errBody?.error as Record<string, unknown> | null | undefined;
        const code = typeof errObj?.code === "string" ? errObj.code : "";
        const apiMsg = typeof errObj?.message === "string" ? errObj.message : "";
        const status = typeof anyErr?.status === "number" ? anyErr.status : 0;
        if (code === "CHECKIN_ALREADY_EXISTS" || code === "CHECKIN_CONFLICT") {
          router.replace("/checkin/result");
          return;
        }
        if (code === "CHECKIN_WINDOW_CLOSED") {
          const msg = apiMsg || "La fenêtre de check-in est fermée pour aujourd'hui.";
          Alert.alert("Check-in fermé", msg, [{ text: "OK", onPress: () => router.back() }]);
          return;
        }
        if (status === 401) {
          Alert.alert(
            "Session expirée",
            "Ta session a expiré. Reconnecte-toi.",
            [{ text: "OK", onPress: () => router.replace("/auth/login") }]
          );
          return;
        }
        Alert.alert(
          "Erreur",
          "Une erreur est survenue. Réessaie.",
          [{ text: "OK" }]
        );
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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar
            progress={stepIndex + 1}
            total={steps.length}
            color={currentColor}
            height={3}
          />
        </View>
        <Text style={[styles.stepCount, { fontFamily: FONTS.mono }]}>
          {stepIndex + 1}/{steps.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconCircle,
              { borderColor: currentColor, backgroundColor: `${currentColor}15` },
            ]}
          >
            <Feather name={currentStep.icon} size={40} color={currentColor} />
          </View>
        </View>

        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{currentStep.title}</Text>
        <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>{currentStep.subtitle}</Text>

        {currentStep.kind === "welcome" && (
          <View style={styles.welcomeSection}>
            {WELCOME_ITEMS.map((item) => (
              <View key={item.key} style={styles.welcomeItem}>
                <View style={[styles.welcomeIconWrap, { backgroundColor: `${item.color}15` }]}>
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[styles.welcomeLabel, { fontFamily: FONTS.bodyMedium }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {currentStep.kind === "slider" && (
          <View style={styles.ratingSection}>
            {currentStep.labels.map((label, idx) => {
              const val = idx + 1;
              const isSelected = values[currentStep.key] === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValues((prev) => ({ ...prev, [(currentStep as { key: string }).key]: val }));
                  }}
                  style={[
                    styles.ratingCard,
                    isSelected && {
                      borderColor: currentStep.color,
                      backgroundColor: `${currentStep.color}15`,
                    },
                  ]}
                >
                  <View style={[
                    styles.ratingNum,
                    { borderColor: isSelected ? currentStep.color : COLORS.border },
                    isSelected && { backgroundColor: currentStep.color },
                  ]}>
                    <Text style={[
                      styles.ratingNumText,
                      { fontFamily: FONTS.mono, color: isSelected ? COLORS.bg : COLORS.textMuted },
                    ]}>
                      {val}
                    </Text>
                  </View>
                  <Text style={[
                    styles.ratingLabel,
                    { fontFamily: FONTS.bodyMedium },
                    isSelected ? { color: currentStep.color } : { color: COLORS.textSecondary },
                  ]}>
                    {label}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={18} color={currentStep.color} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {currentStep.kind === "cycle" && (
          <View style={styles.cycleSection}>
            {CYCLE_PHASES.map((phase) => {
              const isActive = cyclePhase === phase.key;
              return (
                <TouchableOpacity
                  key={phase.key}
                  onPress={() => setCyclePhase((prev) => (prev === phase.key ? null : phase.key))}
                  style={[
                    styles.cycleBtn,
                    isActive && { borderColor: phase.color, backgroundColor: `${phase.color}15` },
                  ]}
                >
                  <View style={[styles.cycleDot, { backgroundColor: isActive ? phase.color : COLORS.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cycleLabel, { fontFamily: FONTS.bodyMedium }, isActive && { color: phase.color }]}>
                      {phase.label}
                    </Text>
                    <Text style={[styles.cycleDesc, { fontFamily: FONTS.mono }]}>{phase.desc}</Text>
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
                  { label: "Aucune douleur", value: false, icon: "check-circle" as const, color: COLORS.green },
                  { label: "J'ai une douleur", value: true, icon: "alert-circle" as const, color: COLORS.red },
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
                    hasPain === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}15` },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={28}
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
                placeholder="Décris la zone douloureuse et l'intensité..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <GradientButton
          label={isLastStep
            ? (isEditMode ? "Mettre à jour mon check-in" : "Valider mon check-in")
            : "Suivant"}
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
  stepCount: { fontSize: 11, color: COLORS.textMuted, minWidth: 30, textAlign: "right" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  iconWrap: { marginTop: 40, marginBottom: 28 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
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
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  welcomeSection: { width: "100%", gap: 10 },
  welcomeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeLabel: { fontSize: 15, color: COLORS.textSecondary },
  ratingSection: { width: "100%", gap: 10 },
  ratingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingNumText: { fontSize: 14 },
  ratingLabel: { flex: 1, fontSize: 15 },
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
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  painOptLabel: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
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
    width: "100%",
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
