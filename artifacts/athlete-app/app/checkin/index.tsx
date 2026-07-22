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
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSubmitCheckin } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { useT } from "@/context/PreferencesContext";

/**
 * Single-screen check-in matching the validated V1 mockup: 4 metrics
 * (Sommeil/Fatigue/Stress/Motivation) with contextual word-ladders, plus a
 * structured injury block (Oui/Non → zone → intensité → note). Replaces the
 * old 5-metric step-wizard (Sommeil/Énergie/Stress/Courbatures/Motivation +
 * separate cycle step) — cycle tracking is hidden from the check-in per V1
 * scope (still auto-derived server-side from the athlete's profile), and
 * Courbatures is dropped (see adapt-engine.ts).
 *
 * "Fatigue" here is the mockup's tiredness axis (1=fresh…5=exhausted) — the
 * opposite polarity of the API's `energy` field (1=exhausted…5=top-shape), so
 * it's inverted on submit: energy = 6 - fatigue. Stress/Sleep/Motivation map
 * straight through — their word-ladder polarity already matches the API.
 */

type MetricKey = "sleep" | "fatigue" | "stress" | "motivation";
type FeatherIcon = keyof typeof Feather.glyphMap;

interface MetricDef {
  key: MetricKey;
  icon: FeatherIcon;
  label: string;
  subtitle: string;
  color: string;
  tone: "positive" | "negative"; // positive: 1=worst…5=best. negative: 1=best…5=worst.
  words: [string, string, string, string, string];
  anchors: [string, string];
}

const METRICS: MetricDef[] = [
  {
    key: "sleep",
    icon: "moon",
    label: "Sommeil",
    subtitle: "Comment as-tu dormi cette nuit ?",
    color: COLORS.cyan,
    tone: "positive",
    words: ["Très mauvais 😵", "Mauvais", "Correct", "Bon", "Réparateur 😴✨"],
    anchors: ["Très mauvaise nuit", "Nuit réparatrice"],
  },
  {
    key: "fatigue",
    icon: "battery",
    label: "Fatigue",
    subtitle: "Quel est ton niveau de fraîcheur ?",
    color: COLORS.green,
    tone: "negative",
    words: ["Frais·che ⚡", "En forme", "Un peu fatigué·e", "Fatigué·e", "Épuisé·e 🪫"],
    anchors: ["Frais·che", "Épuisé·e"],
  },
  {
    key: "stress",
    icon: "activity",
    label: "Stress",
    subtitle: "Quel est ton niveau de stress actuel ?",
    color: COLORS.amber,
    tone: "negative",
    words: ["Détendu·e 😌", "Calme", "Un peu tendu·e", "Stressé·e", "Très stressé·e 😰"],
    anchors: ["Détendu·e", "Très stressé·e"],
  },
  {
    key: "motivation",
    icon: "target",
    label: "Motivation",
    subtitle: "À quel point es-tu motivé(e) pour t'entraîner ?",
    color: COLORS.violet,
    tone: "positive",
    words: ["Aucune envie 😮‍💨", "Peu motivé·e", "Ça va", "Motivé·e", "À fond 🔥"],
    anchors: ["Aucune envie", "À fond"],
  },
];

const BODY_ZONES: Array<{ key: "epaule" | "dos" | "hanche" | "genou" | "cheville" | "autre"; label: string }> = [
  { key: "epaule", label: "Épaule" },
  { key: "dos", label: "Dos" },
  { key: "hanche", label: "Hanche" },
  { key: "genou", label: "Genou" },
  { key: "cheville", label: "Cheville" },
  { key: "autre", label: "Autre" },
];

const INJURY_WORDS = ["Légère gêne", "Gêne présente", "Douleur modérée", "Douleur marquée 😣", "Douleur forte 😖"];

function pillColor(n: number, value: number, tone: "positive" | "negative", color: string): string {
  if (n > value) return "transparent";
  if (tone === "positive") return color;
  // negative tone: color shifts toward red as the selected value worsens (higher = worse)
  if (value >= 4) return COLORS.red;
  if (value >= 3) return "#E8C547";
  return color;
}

function wordColor(value: number, tone: "positive" | "negative", color: string): string {
  if (tone === "positive") {
    if (value >= 4) return color;
    if (value >= 3) return "#E8C547";
    return COLORS.red;
  }
  if (value >= 4) return COLORS.red;
  if (value >= 3) return "#E8C547";
  return color;
}

function MetricSelector({
  metric,
  value,
  onChange,
}: {
  metric: MetricDef;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.metricBlock}>
      <View style={styles.metricHeader}>
        <View style={styles.metricTitleRow}>
          <Feather name={metric.icon} size={15} color={metric.color} />
          <Text style={[styles.metricLabel, { fontFamily: FONTS.bodyBold }]}>{metric.label}</Text>
        </View>
        <Text style={[styles.metricWord, { fontFamily: FONTS.bodyBold, color: wordColor(value, metric.tone, metric.color) }]}>
          {metric.words[value - 1]}
        </Text>
      </View>
      <Text style={[styles.metricSubtitle, { fontFamily: FONTS.body }]}>{metric.subtitle}</Text>
      <View style={styles.pillRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(n);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: n === value }}
            accessibilityLabel={`${metric.label} : ${metric.words[n - 1]}`}
            style={[
              styles.pill,
              {
                backgroundColor: pillColor(n, value, metric.tone, metric.color),
                borderColor: n <= value ? "transparent" : COLORS.border,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.anchorRow}>
        <Text style={[styles.anchorText, { fontFamily: FONTS.body }]}>{metric.anchors[0]}</Text>
        <Text style={[styles.anchorText, { fontFamily: FONTS.body }]}>{metric.anchors[1]}</Text>
      </View>
    </View>
  );
}

export default function CheckinScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const submitMutation = useSubmitCheckin();

  const params = useLocalSearchParams<{
    sleep?: string;
    fatigue?: string;
    stress?: string;
    motivation?: string;
    hasPain?: string;
    painZone?: string;
    painIntensity?: string;
    painNotes?: string;
    edit?: string;
  }>();
  const isEditMode = params.edit === "1";

  const parseNum = (v: string | undefined, fallback: number) => {
    const n = parseInt(v ?? "", 10);
    return isNaN(n) ? fallback : n;
  };

  const [values, setValues] = useState<Record<MetricKey, number>>({
    sleep: parseNum(params.sleep, 3),
    fatigue: parseNum(params.fatigue, 3),
    stress: parseNum(params.stress, 3),
    motivation: parseNum(params.motivation, 3),
  });

  const [hasInjury, setHasInjury] = useState(params.hasPain === "1");
  const [injuryZone, setInjuryZone] = useState<string | null>(params.painZone ?? null);
  const [injuryLevel, setInjuryLevel] = useState(parseNum(params.painIntensity, 2));
  const [injuryNote, setInjuryNote] = useState(params.painNotes ?? "");

  const setMetric = (key: MetricKey) => (n: number) => setValues((v) => ({ ...v, [key]: n }));

  const submit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await submitMutation.mutateAsync({
        data: {
          sleep: values.sleep,
          energy: 6 - values.fatigue, // Fatigue (1=fresh…5=exhausted) inverted to the API's energy polarity
          stress: values.stress,
          motivation: values.motivation,
          hasPain: hasInjury,
          painZone: hasInjury ? (injuryZone as never) : null,
          painIntensity: hasInjury ? injuryLevel : null,
          painNotes: hasInjury ? (injuryNote || null) : null,
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
          fatigue: String(values.fatigue),
          stress: String(values.stress),
          motivation: String(values.motivation),
          hasPainParam: hasInjury ? "1" : "0",
          painZone: hasInjury ? (injuryZone ?? "") : "",
          painIntensity: hasInjury ? String(injuryLevel) : "",
          painNotes: hasInjury ? injuryNote : "",
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
        Alert.alert("Check-in fermé", apiMsg || "La fenêtre de check-in est fermée pour aujourd'hui.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      if (status === 401) {
        Alert.alert("Session expirée", "Ta session a expiré. Reconnecte-toi.", [
          { text: "OK", onPress: () => router.replace("/auth/login") },
        ]);
        return;
      }
      Alert.alert("Erreur", "Une erreur est survenue. Réessaie.", [{ text: "OK" }]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: FONTS.title }]}>
          {t("checkin_title", "Comment tu te sens ?")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerSubtitle, { fontFamily: FONTS.body }]}>
          {t("checkin_subtitle", "30 secondes pour ajuster ta séance du jour")}
        </Text>

        {METRICS.map((metric) => (
          <MetricSelector key={metric.key} metric={metric} value={values[metric.key]} onChange={setMetric(metric.key)} />
        ))}

        {/* Blessure / gêne physique */}
        <View
          style={[
            styles.injuryCard,
            { borderColor: hasInjury ? `${COLORS.red}55` : COLORS.border },
          ]}
        >
          <View style={styles.injuryHeader}>
            <View style={styles.metricTitleRow}>
              <Feather name="alert-triangle" size={15} color={hasInjury ? COLORS.red : COLORS.cyan} />
              <Text style={[styles.metricLabel, { fontFamily: FONTS.bodyBold }]}>Blessure ou gêne ?</Text>
            </View>
            <View style={styles.injuryToggleRow}>
              {[{ v: false, label: "Non" }, { v: true, label: "Oui" }].map((opt) => (
                <Pressable
                  key={String(opt.v)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHasInjury(opt.v);
                  }}
                  style={[
                    styles.injuryToggleBtn,
                    {
                      backgroundColor: hasInjury === opt.v ? (opt.v ? COLORS.red : COLORS.cyan) : COLORS.bgInput,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.injuryToggleText,
                      { fontFamily: FONTS.bodyBold, color: hasInjury === opt.v ? COLORS.textInverse : COLORS.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {hasInjury && (
            <View style={styles.injuryDetail}>
              <Text style={[styles.injurySectionLabel, { fontFamily: FONTS.mono }]}>OÙ ?</Text>
              <View style={styles.zoneRow}>
                {BODY_ZONES.map((zone) => {
                  const selected = injuryZone === zone.key;
                  return (
                    <Pressable
                      key={zone.key}
                      onPress={() => setInjuryZone(zone.key)}
                      style={[
                        styles.zoneChip,
                        { backgroundColor: selected ? COLORS.red : COLORS.bgInput, borderColor: selected ? "transparent" : COLORS.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.zoneChipText,
                          { fontFamily: FONTS.bodyBold, color: selected ? COLORS.textInverse : COLORS.textSecondary },
                        ]}
                      >
                        {zone.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.metricLabel, { fontFamily: FONTS.bodyBold, marginTop: 14 }]}>Intensité</Text>
              <Text style={[styles.metricWord, { fontFamily: FONTS.bodyBold, color: wordColor(injuryLevel, "negative", COLORS.cyan), marginBottom: 8 }]}>
                {INJURY_WORDS[injuryLevel - 1]}
              </Text>
              <View style={styles.pillRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setInjuryLevel(n)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: pillColor(n, injuryLevel, "negative", COLORS.cyan),
                        borderColor: n <= injuryLevel ? "transparent" : COLORS.border,
                      },
                    ]}
                  />
                ))}
              </View>

              <TextInput
                style={[styles.injuryInput, { fontFamily: FONTS.body }]}
                value={injuryNote}
                onChangeText={setInjuryNote}
                placeholder="Précise si tu veux : depuis quand, quel mouvement fait mal..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={2}
              />
              <Text style={[styles.injuryHint, { fontFamily: FONTS.body }]}>
                Ton coach est prévenu immédiatement et ta séance est adaptée pour protéger la zone.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <GradientButton
          label={isEditMode ? t("update_my_checkin", "Mettre à jour mon check-in") : t("submit_checkin", "Valider mon check-in")}
          onPress={submit}
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
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, color: COLORS.white, flexShrink: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
  metricBlock: { marginBottom: 22 },
  metricHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  metricTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricLabel: { fontSize: 14, color: COLORS.textPrimary },
  metricWord: { fontSize: 12 },
  metricSubtitle: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10 },
  pillRow: { flexDirection: "row", gap: 6 },
  pill: { flex: 1, height: 30, borderRadius: 15, borderWidth: 1 },
  anchorRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  anchorText: { fontSize: 10, color: COLORS.textMuted },
  injuryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    backgroundColor: COLORS.bgCard,
    marginBottom: 8,
  },
  injuryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  injuryToggleRow: { flexDirection: "row", gap: 6 },
  injuryToggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  injuryToggleText: { fontSize: 11 },
  injuryDetail: { marginTop: 14 },
  injurySectionLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6 },
  zoneRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  zoneChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  zoneChipText: { fontSize: 11 },
  injuryInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: "top",
    marginTop: 10,
  },
  injuryHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 8, lineHeight: 15 },
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
