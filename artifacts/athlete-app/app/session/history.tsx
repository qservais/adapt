import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetSessionHistory } from "@workspace/api-client-react";
import type { SessionLogSummary } from "@workspace/api-client-react";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";

export default function SessionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const historyQuery = useGetSessionHistory();

  const completedLogs = (historyQuery.data ?? []).filter((l) => l.completedAt != null);
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>HISTORIQUE</Text>
        <View style={{ width: 30 }} />
      </View>

      {completedLogs.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={40} color={COLORS.textMuted} />
          <Text style={[styles.emptyTitle, { fontFamily: FONTS.bodyBold }]}>
            Aucune séance terminée
          </Text>
          <Text style={[styles.emptyDesc, { fontFamily: FONTS.body }]}>
            Tes séances complétées apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={completedLogs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 20,
            paddingTop: 8,
          }}
          renderItem={({ item }: { item: SessionLogSummary }) => {
            const mode = item.variantMode as SessionMode;
            const c = MODE_CONFIG[mode] ?? MODE_CONFIG.normal;
            return (
              <TouchableOpacity
                style={styles.historyRow}
                onPress={() =>
                  router.push({
                    pathname: "/session/detail/[logId]",
                    params: { logId: item.id },
                  })
                }
                activeOpacity={0.7}
              >
                <View style={[styles.historyDot, { backgroundColor: c.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyName, { fontFamily: FONTS.bodyMedium }]} numberOfLines={1}>
                    {item.sessionName ?? c.label}
                  </Text>
                  <Text style={[styles.historyDate, { fontFamily: FONTS.mono }]}>
                    {new Date(item.completedAt!).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  {item.rpe != null ? (
                    <Text style={[styles.rpe, { fontFamily: FONTS.mono }]}>RPE {item.rpe}</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: "/session/rate",
                          params: { sessionLogId: item.id, sessionName: item.sessionName ?? "" },
                        });
                      }}
                      style={styles.rateChip}
                      activeOpacity={0.7}
                    >
                      <Feather name="star" size={10} color={COLORS.amber} />
                      <Text style={[styles.rateChipText, { fontFamily: FONTS.mono }]}>Évaluer</Text>
                    </TouchableOpacity>
                  )}
                  {item.durationMin != null && (
                    <Text style={[styles.duration, { fontFamily: FONTS.mono }]}>
                      {item.durationMin} min
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  screenTitle: { fontSize: 28, color: COLORS.white, letterSpacing: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, color: COLORS.textSecondary },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 21 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  historyName: { fontSize: 15, color: COLORS.white, marginBottom: 2 },
  historyDate: { fontSize: 11, color: COLORS.textMuted },
  historyRight: { alignItems: "flex-end", gap: 2 },
  rpe: { fontSize: 12, color: COLORS.amber },
  rateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.amber}40`,
    backgroundColor: `${COLORS.amber}12`,
  },
  rateChipText: { fontSize: 10, color: COLORS.amber },
  duration: { fontSize: 11, color: COLORS.textMuted },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },
});
