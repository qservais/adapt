import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetMyCredits } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT } from "@/context/PreferencesContext";

export function CreditsBalanceCard() {
  const t = useT();
  const { data: credits } = useGetMyCredits();

  return (
    <TouchableOpacity
      onPress={() => router.push("/shop" as any)}
      style={styles.card}
      activeOpacity={0.8}
    >
      <View style={styles.item}>
        <Text style={[styles.val, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>{credits?.collectif ?? 0}</Text>
        <Text style={[styles.label, { fontFamily: FONTS.body }]}>{t("credit_short_collectif", "Collectifs")}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[styles.val, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>{credits?.individuel ?? 0}</Text>
        <Text style={[styles.label, { fontFamily: FONTS.body }]}>{t("credit_short_individuel", "1:1")}</Text>
      </View>
      <View style={styles.spacer} />
      <Feather name="shopping-bag" size={16} color={COLORS.textMuted} />
      <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  item: { alignItems: "center", gap: 2 },
  val: { fontSize: 18 },
  label: { fontSize: 10, color: COLORS.textMuted },
  divider: { width: 1, height: 24, backgroundColor: COLORS.border },
  spacer: { flex: 1 },
});
