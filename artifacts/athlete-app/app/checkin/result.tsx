import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { AdaptScoreDisplay } from "@/components/ui/AdaptScoreDisplay";

export default function CheckinResultScreen() {
  const insets = useSafeAreaInsets();
  const { score, mode } = useLocalSearchParams<{ score: string; mode: string }>();
  const scoreNum = parseInt(score ?? "0");
  const modeKey = (mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  const getMessage = () => {
    switch (modeKey) {
      case "performance":
        return "Excellente forme aujourd'hui ! Ta séance est renforcée. Vas tout donner.";
      case "adapt":
        return "Ton corps a besoin d'ajustements. La séance a été calibrée en conséquence.";
      case "recovery":
        return "Ton corps demande du repos. Aujourd'hui, c'est récupération. Respecte-le.";
      default:
        return "Bonne forme. Séance standard prête — entraîne-toi intelligemment.";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.topLabel, { fontFamily: FONTS.mono }]}>CHECK-IN TERMINÉ</Text>

        <View style={styles.scoreWrap}>
          <AdaptScoreDisplay score={scoreNum} mode={modeKey} size="lg" />
        </View>

        <View style={[styles.messageBox, { borderColor: cfg.color, backgroundColor: `${cfg.color}10` }]}>
          <Text style={[styles.message, { fontFamily: FONTS.body }]}>
            {getMessage()}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.replace("/session")}
            style={[styles.primaryBtn, { backgroundColor: cfg.color }]}
          >
            <Feather name="zap" size={18} color={COLORS.bg} />
            <Text style={[styles.primaryBtnText, { fontFamily: FONTS.bodyBold, color: COLORS.bg }]}>
              Voir ma séance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={styles.secondaryBtn}
          >
            <Text style={[styles.secondaryBtnText, { fontFamily: FONTS.body }]}>
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "space-between",
  },
  topLabel: {
    fontSize: 11,
    color: COLORS.green,
    letterSpacing: 3,
  },
  scoreWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: "100%",
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: "center",
    lineHeight: 26,
  },
  actions: { width: "100%", gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
  },
  primaryBtnText: { fontSize: 16, letterSpacing: 0.5 },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryBtnText: { fontSize: 15, color: COLORS.textSecondary },
});
