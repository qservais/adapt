import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, Linking, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetResourceFiles, getResourceFileSignedUrl } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT } from "@/context/PreferencesContext";

export default function ResourceFilesScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const { data: files, isLoading } = useGetResourceFiles();
  const [openingId, setOpeningId] = React.useState<string | null>(null);

  const handleOpen = async (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    try {
      const res = await getResourceFileSignedUrl(id);
      await Linking.openURL(res.signedUrl);
    } catch {
      Alert.alert(t("error", "Erreur"), t("resource_file_open_error", "Impossible d'ouvrir ce fichier."));
    } finally {
      setOpeningId(null);
    }
  };

  const list = files ?? [];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 20,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("my_documents_uc", "MES DOCUMENTS")}</Text>
      </View>

      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        {t("resource_files_subtitle", "Documents partagés par ton coach.")}
      </Text>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} />
        </View>
      )}

      {!isLoading && list.length === 0 && (
        <View style={styles.emptyBox}>
          <Feather name="file-text" size={28} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            {t("resource_files_empty", "Aucun document partagé pour le moment.")}
          </Text>
        </View>
      )}

      {list.map((f) => (
        <TouchableOpacity
          key={f.id}
          style={styles.fileCard}
          activeOpacity={0.8}
          onPress={() => handleOpen(f.id)}
          disabled={!!openingId}
        >
          <Feather name="file-text" size={18} color={COLORS.amber} />
          <View style={styles.fileInfo}>
            <Text style={[styles.fileTitle, { fontFamily: FONTS.bodyMedium }]} numberOfLines={1}>
              {f.title}
            </Text>
            <Text style={[styles.fileDate, { fontFamily: FONTS.mono }]}>
              {new Date(f.uploadedAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          {openingId === f.id ? (
            <ActivityIndicator size="small" color={COLORS.textMuted} />
          ) : (
            <Feather name="external-link" size={14} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 28, color: COLORS.white, letterSpacing: 3 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  center: { alignItems: "center", paddingVertical: 40 },
  emptyBox: { paddingVertical: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  fileCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fileInfo: { flex: 1, gap: 3 },
  fileTitle: { fontSize: 14, color: COLORS.white },
  fileDate: { fontSize: 11, color: COLORS.textMuted },
});
