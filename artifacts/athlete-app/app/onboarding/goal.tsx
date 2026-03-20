import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUpdateMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { Button } from "@/components/ui/Button";

const GOALS = [
  {
    key: "strength",
    label: "Build Strength",
    desc: "Get stronger and increase max lifts",
    icon: "trending-up" as const,
    color: COLORS.violet,
  },
  {
    key: "muscle",
    label: "Gain Muscle",
    desc: "Build lean mass and improve body composition",
    icon: "activity" as const,
    color: COLORS.green,
  },
  {
    key: "fat_loss",
    label: "Lose Fat",
    desc: "Reduce body fat while maintaining muscle",
    icon: "target" as const,
    color: COLORS.amber,
  },
  {
    key: "performance",
    label: "Performance",
    desc: "Optimize speed, power and endurance",
    icon: "zap" as const,
    color: COLORS.cyan,
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
        await updateMutation.mutateAsync({ data: { primaryGoal: selected } });
        router.push("/onboarding/invite");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save goal";
        setError(msg);
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
      <Text style={[styles.title, { fontFamily: FONTS.title }]}>PRIMARY GOAL</Text>
      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        ADAPT tailors load targets to your objective.
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
        <Button label="Continue" onPress={handleNext} loading={updateMutation.isPending} />
        <Button
          label="Skip"
          onPress={() => router.push("/onboarding/invite")}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  stepIndicator: { marginBottom: 16 },
  step: { fontSize: 13, color: COLORS.green, letterSpacing: 2 },
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
});
