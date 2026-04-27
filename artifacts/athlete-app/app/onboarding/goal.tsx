import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUpdateMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { getGenericErrorMessage } from "@/lib/errors";

const GOALS = [
  {
    key: "strength",
    label: "Force",
    desc: "Augmenter ta force et tes charges maximales",
    icon: "trending-up" as const,
    color: COLORS.violet,
  },
  {
    key: "muscle",
    label: "Prise de masse",
    desc: "Développer la masse musculaire et améliorer la composition corporelle",
    icon: "activity" as const,
    color: COLORS.cyan,
  },
  {
    key: "fat_loss",
    label: "Perte de poids",
    desc: "Réduire la masse grasse en préservant le muscle",
    icon: "target" as const,
    color: COLORS.amber,
  },
  {
    key: "performance",
    label: "Performance",
    desc: "Optimiser la vitesse, la puissance et l'endurance",
    icon: "zap" as const,
    color: COLORS.green,
  },
];

export default function GoalScreen() {
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateMe();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleNext = async () => {
    setError("");
    if (selected) {
      try {
        await updateMutation.mutateAsync({ data: { primaryGoal: selected as "strength" | "muscle" | "fat_loss" | "performance" } });
        router.push("/onboarding/invite");
      } catch (err: unknown) {
        setError(getGenericErrorMessage(err, "Impossible d'enregistrer l'objectif."));
      }
    } else {
      router.push("/onboarding/invite");
    }
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={styles.stepIndicator}>
        <Text style={[styles.step, { fontFamily: FONTS.mono }]}>03 / 05</Text>
      </View>
      <Text style={[styles.title, { fontFamily: FONTS.title }]}>OBJECTIF</Text>
      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        ADAPT calibre les charges et l'intensité selon ton but.
      </Text>

      <View style={styles.grid}>
        {GOALS.map((goal) => {
          const isActive = selected === goal.key;
          return (
            <TouchableOpacity
              key={goal.key}
              onPress={() => setSelected(goal.key)}
              style={[
                styles.card,
                isActive && {
                  borderColor: goal.color,
                  backgroundColor: `${goal.color}15`,
                },
              ]}
            >
              <Feather
                name={goal.icon}
                size={28}
                color={isActive ? goal.color : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.cardTitle,
                  { fontFamily: FONTS.bodyBold },
                  isActive && { color: goal.color },
                ]}
              >
                {goal.label}
              </Text>
              <Text style={[styles.cardDesc, { fontFamily: FONTS.body }]}>
                {goal.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <Text style={[styles.error, { fontFamily: FONTS.body }]}>{error}</Text>
      ) : null}
      <View style={styles.actions}>
        <GradientButton label="Continuer" onPress={handleNext} loading={updateMutation.isPending} />
        <TouchableOpacity
          onPress={() => router.push("/onboarding/invite")}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { fontFamily: FONTS.body }]}>Passer pour l'instant</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  stepIndicator: { marginBottom: 16 },
  step: { fontSize: 13, color: COLORS.cyan, letterSpacing: 2 },
  title: { fontSize: 48, color: COLORS.white, letterSpacing: 4, lineHeight: 52 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, marginBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
  card: {
    width: "47%",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    minHeight: 140,
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 15, color: COLORS.white },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  actions: { gap: 12 },
  error: { color: COLORS.red, fontSize: 13, textAlign: "center", marginBottom: 8 },
  skipBtn: { alignItems: "center", padding: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },
});
