import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { useT } from "@/context/PreferencesContext";

const FEATURES = [
  {
    icon: "activity" as const,
    title: "Check-in quotidien",
    desc: "Évalue sommeil, énergie, stress, courbatures et motivation en moins d'une minute.",
    color: COLORS.cyan,
  },
  {
    icon: "zap" as const,
    title: "ADAPT Score",
    desc: "Ton score (0–100) détermine le mode de séance idéal pour ton corps aujourd'hui.",
    color: COLORS.amber,
  },
  {
    icon: "bar-chart-2" as const,
    title: "Suivi de progression",
    desc: "Vue calendrier, graphiques de tendance et bilans hebdomadaires pour rester dans l'axe.",
    color: COLORS.violet,
  },
  {
    icon: "users" as const,
    title: "Connexion coach",
    desc: "Ton coach voit tes données et adapte ton programme en temps réel.",
    color: COLORS.green,
  },
];

export default function OnboardingSplashScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.logo, { fontFamily: FONTS.title }]}>ADAPT</Text>
        <Text style={[styles.tagline, { fontFamily: FONTS.body }]}>
          {t("auth_tagline", "Entraîne-toi intelligemment. Récupère mieux. Performe davantage.")}
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
        <GradientButton
          label={t("setup_profile", "Configurer mon profil")}
          onPress={() => router.push("/onboarding/profile")}
        />
        <Text style={[styles.steps, { fontFamily: FONTS.mono }]}>
          5 ÉTAPES RAPIDES · MOINS DE 2 MINUTES
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
    color: COLORS.cyan,
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
