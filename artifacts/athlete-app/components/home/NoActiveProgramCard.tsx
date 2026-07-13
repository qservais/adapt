import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";
import { useT } from "@/context/PreferencesContext";

function toWhatsAppUrl(whatsappNumber: string): string {
  const digits = whatsappNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}`;
}

export function NoActiveProgramCard({ whatsappNumber }: { whatsappNumber: string | null }) {
  const t = useT();

  const handleWhatsApp = async () => {
    if (!whatsappNumber) return;
    try {
      await Linking.openURL(toWhatsAppUrl(whatsappNumber));
    } catch {
      Alert.alert(t("error", "Erreur"), t("whatsapp_open_error", "Impossible d'ouvrir WhatsApp."));
    }
  };

  return (
    <GlowCard glowColor={COLORS.amber} style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather name="calendar" size={28} color={COLORS.amber} />
      </View>
      <Text style={[styles.title, { fontFamily: FONTS.bodyBold }]}>
        {t("no_program_title", "Pas encore de programme")}
      </Text>
      <Text style={[styles.desc, { fontFamily: FONTS.body }]}>
        {t("no_program_desc", "Ton coach n'a pas encore créé de programme pour toi. Contacte-le pour démarrer, ou explore la bibliothèque en attendant.")}
      </Text>
      <View style={styles.actions}>
        {whatsappNumber && (
          <TouchableOpacity onPress={handleWhatsApp} style={styles.whatsappBtn} activeOpacity={0.85}>
            <Feather name="message-circle" size={16} color={COLORS.bg} />
            <Text style={[styles.whatsappBtnText, { fontFamily: FONTS.bodyBold }]}>
              {t("contact_coach_whatsapp", "Contacter mon coach")}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.push("/library")} style={styles.libraryBtn} activeOpacity={0.7}>
          <Feather name="book-open" size={14} color={COLORS.cyan} />
          <Text style={[styles.libraryBtnText, { fontFamily: FONTS.bodyMedium }]}>
            {t("explore_library", "Explorer la bibliothèque")}
          </Text>
        </TouchableOpacity>
      </View>
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 10, paddingVertical: 24 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.amber}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 17, color: COLORS.white, textAlign: "center" },
  desc: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 19, paddingHorizontal: 12 },
  actions: { width: "100%", gap: 10, marginTop: 8 },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingVertical: 12,
  },
  whatsappBtnText: { fontSize: 14, color: COLORS.bg },
  libraryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  libraryBtnText: { fontSize: 13, color: COLORS.cyan },
});
