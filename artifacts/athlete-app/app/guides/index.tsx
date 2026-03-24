import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";

interface GuideItem {
  id: string;
  title: string;
  category: string | null;
  sortOrder: number | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  training: "Entraînement",
  nutrition: "Nutrition",
  recovery: "Récupération",
  mindset: "Mental",
};

const CATEGORY_COLORS: Record<string, string> = {
  training: COLORS.cyan,
  nutrition: COLORS.green,
  recovery: COLORS.violet,
  mindset: COLORS.amber,
};

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  training: "trending-up",
  nutrition: "coffee",
  recovery: "heart",
  mindset: "zap",
};

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const { data: guides, isLoading, error } = useQuery<GuideItem[]>({
    queryKey: ["/api/guides"],
    queryFn: () => customFetch("/api/guides"),
  });

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 40,
        paddingHorizontal: 20,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>GUIDES</Text>
      </View>

      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        Comprends les principes qui font progresser.
      </Text>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} />
        </View>
      )}

      {error != null && (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
            Impossible de charger les guides.
          </Text>
        </View>
      )}

      {guides != null && guides.map((guide) => {
        const color = CATEGORY_COLORS[guide.category ?? ""] ?? COLORS.textMuted;
        const icon = CATEGORY_ICONS[guide.category ?? ""] ?? "book-open";
        const label = CATEGORY_LABELS[guide.category ?? ""] ?? guide.category ?? "";
        return (
          <TouchableOpacity
            key={guide.id}
            style={[styles.card, { borderColor: `${color}30` }]}
            onPress={() => router.push(`/guides/${guide.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
              <Feather name={icon} size={22} color={color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { fontFamily: FONTS.bodyBold }]}>
                {guide.title}
              </Text>
              {label ? (
                <Text style={[styles.cardCategory, { fontFamily: FONTS.mono, color }]}>
                  {label.toUpperCase()}
                </Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 32, color: COLORS.white, letterSpacing: 3 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  center: { alignItems: "center", paddingVertical: 40 },
  errorBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 14, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, color: COLORS.white },
  cardCategory: { fontSize: 10, letterSpacing: 1.5 },
});
