import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUpdateMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";

const FITNESS_LEVELS = [
  {
    key: "beginner",
    label: "Débutant",
    desc: "Moins d'1 an d'entraînement régulier",
    icon: "zap" as const,
  },
  {
    key: "intermediate",
    label: "Intermédiaire",
    desc: "1 à 3 ans d'entraînement structuré",
    icon: "trending-up" as const,
  },
  {
    key: "advanced",
    label: "Avancé",
    desc: "3+ ans avec une programmation structurée",
    icon: "award" as const,
  },
];

export default function FitnessLevelScreen() {
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateMe();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleNext = async () => {
    if (selected) {
      try {
        await updateMutation.mutateAsync({ data: { fitnessLevel: selected as "beginner" | "intermediate" | "advanced" } });
        router.push("/onboarding/goal");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Impossible d'enregistrer le niveau";
        setError(msg);
      }
    } else {
      router.push("/onboarding/goal");
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
        <Text style={[styles.step, { fontFamily: FONTS.mono }]}>02 / 05</Text>
      </View>
      <Text style={[styles.title, { fontFamily: FONTS.title }]}>NIVEAU</Text>
      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        Choisis ce qui te correspond le mieux.
      </Text>

      <View style={styles.cards}>
        {FITNESS_LEVELS.map((level) => {
          const isActive = selected === level.key;
          return (
            <TouchableOpacity
              key={level.key}
              onPress={() => setSelected(level.key)}
              style={[
                styles.card,
                isActive && {
                  borderColor: COLORS.cyan,
                  backgroundColor: COLORS.cyanDim,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  isActive && { backgroundColor: COLORS.cyan },
                ]}
              >
                <Feather
                  name={level.icon}
                  size={22}
                  color={isActive ? COLORS.bg : COLORS.textSecondary}
                />
              </View>
              <View style={styles.cardText}>
                <Text
                  style={[
                    styles.cardTitle,
                    { fontFamily: FONTS.bodyBold },
                    isActive && { color: COLORS.cyan },
                  ]}
                >
                  {level.label}
                </Text>
                <Text style={[styles.cardDesc, { fontFamily: FONTS.body }]}>
                  {level.desc}
                </Text>
              </View>
              {isActive && (
                <Feather name="check-circle" size={20} color={COLORS.cyan} />
              )}
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
          onPress={() => router.push("/onboarding/goal")}
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
  cards: { gap: 12, marginBottom: 32 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, color: COLORS.white, marginBottom: 3 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary },
  actions: { gap: 12 },
  error: { color: COLORS.red, fontSize: 13, textAlign: "center", marginBottom: 8 },
  skipBtn: { alignItems: "center", padding: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },
});
