import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUpdateMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { Button } from "@/components/ui/Button";

const FITNESS_LEVELS = [
  {
    key: "beginner",
    label: "Beginner",
    desc: "Less than 1 year of training",
    icon: "zap" as const,
  },
  {
    key: "intermediate",
    label: "Intermediate",
    desc: "1–3 years of consistent training",
    icon: "trending-up" as const,
  },
  {
    key: "advanced",
    label: "Advanced",
    desc: "3+ years, structured programming",
    icon: "award" as const,
  },
];

export default function FitnessLevelScreen() {
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateMe();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = async () => {
    if (selected) {
      try {
        await updateMutation.mutateAsync({ data: { fitnessLevel: selected } });
      } catch {
      }
    }
    router.push("/onboarding/goal");
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
      <Text style={[styles.title, { fontFamily: FONTS.title }]}>FITNESS LEVEL</Text>
      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        Choose what best describes you.
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
                  borderColor: COLORS.green,
                  backgroundColor: COLORS.greenDim,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  isActive && { backgroundColor: COLORS.green },
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
                    isActive && { color: COLORS.green },
                  ]}
                >
                  {level.label}
                </Text>
                <Text style={[styles.cardDesc, { fontFamily: FONTS.body }]}>
                  {level.desc}
                </Text>
              </View>
              {isActive && (
                <Feather name="check-circle" size={20} color={COLORS.green} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button label="Continue" onPress={handleNext} />
        <Button
          label="Skip"
          onPress={() => router.push("/onboarding/goal")}
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
});
