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
import { Button } from "@/components/ui/Button";

type IconName = "sun" | "zap" | "activity" | "thermometer" | "target" | "alert-triangle";

interface SliderStep {
  kind: "slider";
  key: "sleep" | "energy" | "stress" | "soreness" | "motivation";
  title: string;
  subtitle: string;
  icon: IconName;
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
    labels: ["Très mal", "Mal", "Correct", "Bien", "Excellent"],
  },
  {
    kind: "slider",
    key: "energy",
    title: "ÉNERGIE",
    subtitle: "Quel est ton niveau d'énergie en ce moment ?",
    icon: "zap",
    labels: ["Épuisé", "Fatigué", "Neutre", "Bien", "Au top"],
  },
  {
    kind: "slider",
    key: "stress",
    title: "STRESS",
    subtitle: "Quel est ton niveau de stress actuel ?",
    icon: "activity",
    labels: ["Très stressé", "Stressé", "Neutre", "Calme", "Très calme"],
  },
  {
    kind: "slider",
    key: "soreness",
    title: "COURBATURES",
    subtitle: "As-tu des douleurs ou courbatures musculaires ?",
    icon: "thermometer",
    labels: ["Très douloureux", "Douloureux", "Moyen", "Peu", "Aucun"],
  },
  {
    kind: "slider",
    key: "motivation",
    title: "MOTIVATION",
    subtitle: "À quel point es-tu motivé(e) pour t'entraîner ?",
    icon: "target",
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

const SCORE_COLORS = [COLORS.red, COLORS.red, COLORS.amber, COLORS.green, COLORS.green];
const SCORE_ICONS = ["frown", "meh", "meh", "smile", "zap"] as const;

const CYCLE_PHASES = [
  { key: "menstrual", label: "Menstruelle", desc: "Jours 1–5", color: COLORS.red },
  { key: "follicular", label: "Folliculaire", desc: "Jours 6–13", color: COLORS.cyan },
  { key: "ovulatory", label: "Ovulation", desc: "Jour 14", color: COLORS.green },
  { key: "luteal", label: "Lutéale", desc: "Jours 15–28", color: COLORS.amber },
] as const;

type CyclePhase = (typeof CYCLE_PHASES)[number]["key"] | null;

function ScoreSelector({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: [string, string, string, string, string];
}) {
  return (
    <View style={scoreStyles.container}>
      <View style={scoreStyles.buttonsRow}>
        {[1, 2, 3, 4, 5].map((v) => {
          const isActive = value === v;
          const color = SCORE_COLORS[v - 1];
          return (
            <TouchableOpacity
              key={v}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(v);
              }}
              style={[
                scoreStyles.btn,
                isActive && { backgroundColor: color, borderColor: color, shadowColor: color },
              ]}
            >
              <Text
                style={[
                  scoreStyles.btnNum,
                  { fontFamily: FONTS.monoBold },
                  isActive && { color: COLORS.bg },
                  !isActive && { color: color },
                ]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={scoreStyles.labelsRow}>
        <Text style={[scoreStyles.labelText, { fontFamily: FONTS.body }]}>
          {labels[0]}
        </Text>
        <Text style={[scoreStyles.labelText, { fontFamily: FONTS.body }]}>
          {labels[4]}
        </Text>
      </View>
      {value > 0 && (
        <View style={[scoreStyles.selectedLabel, { borderColor: SCORE_COLORS[value - 1], backgroundColor: `${SCORE_COLORS[value - 1]}15` }]}>
          <Text style={[scoreStyles.selectedText, { fontFamily: FONTS.bodyMedium, color: SCORE_COLORS[value - 1] }]}>
            {labels[value - 1]}
          </Text>
        </View>
      )}
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  container: { width: "100%", gap: 12, alignItems: "center" },
  buttonsRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  btnNum: { fontSize: 20 },
  labelsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 4 },
  labelText: { fontSize: 11, color: COLORS.textMuted },
  selectedLabel: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  selectedText: { fontSize: 14 },
});

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

  const WELCOME_ITEMS = [
    { key: "sleep", label: "Sommeil", icon: "sun" as const },
    { key: "energy", label: "Énergie", icon: "zap" as const },
    { key: "stress", label: "Stress", icon: "activity" as const },
    { key: "soreness", label: "Courbatures", icon: "thermometer" as const },
    { key: "motivation", label: "Motivation", icon: "target" as const },
  ];

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
              {WELCOME_ITEMS.map((item) => (
                <View key={item.key} style={styles.welcomeItem}>
                  <Feather name={item.icon} size={16} color={COLORS.green} />
                  <Text style={[styles.welcomeLabel, { fontFamily: FONTS.body }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {currentStep.kind === "slider" && (
          <View style={styles.sliderSection}>
            <ScoreSelector
              value={values[currentStep.key]}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [currentStep.key]: v }))
              }
              labels={currentStep.labels}
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
                placeholder="Décris la zone douloureuse et l'intensité..."
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
          label={isLastStep ? "Valider mon check-in" : "Suivant"}
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
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeLabel: { fontSize: 15, color: COLORS.textSecondary },
  sliderSection: {
    width: "100%",
    gap: 16,
  },
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
