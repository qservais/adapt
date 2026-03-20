import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { Button } from "@/components/ui/Button";

const { height } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "activity" as const,
    title: "Daily Check-in",
    desc: "Rate sleep, energy, stress, soreness & motivation in under 60 seconds.",
    color: COLORS.green,
  },
  {
    icon: "zap" as const,
    title: "ADAPT Score",
    desc: "Your score (0-100) determines the ideal session mode for your body today.",
    color: COLORS.amber,
  },
  {
    icon: "bar-chart-2" as const,
    title: "Track Progress",
    desc: "Calendar views, trend charts, and weekly summaries keep you on track.",
    color: COLORS.cyan,
  },
  {
    icon: "users" as const,
    title: "Coach Connection",
    desc: "Your coach sees your data and tailors your programme in real-time.",
    color: COLORS.violet,
  },
];

export default function OnboardingSplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.logo, { fontFamily: FONTS.title }]}>ADAPT</Text>
        <Text style={[styles.logoSub, { fontFamily: FONTS.body }]}>by LMJ</Text>
        <Text style={[styles.tagline, { fontFamily: FONTS.body }]}>
          Train smarter. Recover faster. Perform better.
        </Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${f.color}20` }]}>
              <Feather name={f.icon} size={22} color={f.color} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { fontFamily: FONTS.bodyBold, color: f.color }]}>
                {f.title}
              </Text>
              <Text style={[styles.featureDesc, { fontFamily: FONTS.body }]}>
                {f.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Set Up My Profile"
          onPress={() => router.push("/onboarding/profile")}
        />
        <Text style={[styles.steps, { fontFamily: FONTS.mono }]}>
          5 QUICK STEPS · TAKES LESS THAN 2 MINUTES
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: 20,
  },
  logo: {
    fontSize: 80,
    color: COLORS.green,
    letterSpacing: 12,
    lineHeight: 80,
  },
  logoSub: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 4,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    gap: 20,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  featureRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, marginBottom: 3 },
  featureDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  actions: { gap: 12 },
  steps: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "center",
    letterSpacing: 2,
  },
});
