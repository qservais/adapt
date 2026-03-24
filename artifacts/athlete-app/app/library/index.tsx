import React, { useState } from "react";
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

interface Routine {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number | null;
  exercises: { name: string; sets?: string; notes?: string }[];
}

const CATEGORIES: { key: string; label: string; icon: React.ComponentProps<typeof Feather>["name"]; color: string; emoji: string }[] = [
  { key: "warmup", label: "Échauffements", icon: "zap", color: COLORS.amber, emoji: "🔥" },
  { key: "reathletisation", label: "Réathlétisation", icon: "activity", color: COLORS.cyan, emoji: "🫀" },
  { key: "relaxation", label: "Relaxation", icon: "moon", color: COLORS.violet, emoji: "🌙" },
  { key: "breathing", label: "Respiration", icon: "wind", color: COLORS.green, emoji: "🍃" },
];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const [activeCategory, setActiveCategory] = useState<string>("warmup");

  const { data: routines, isLoading, error } = useQuery<Routine[]>({
    queryKey: ["/api/content-routines"],
    queryFn: () => customFetch("/api/content-routines"),
  });

  const filtered = (routines ?? []).filter(r => r.category === activeCategory);
  const activeCat = CATEGORIES.find(c => c.key === activeCategory);

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
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>BIBLIOTHÈQUE</Text>
      </View>

      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        Routines de soutien à consulter librement.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabs}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                styles.categoryTab,
                active && { borderColor: cat.color, backgroundColor: `${cat.color}18` },
              ]}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  { fontFamily: FONTS.bodyMedium, color: active ? cat.color : COLORS.textMuted },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} />
        </View>
      )}

      {error != null && (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
            Impossible de charger la bibliothèque.
          </Text>
        </View>
      )}

      {filtered.map((routine) => (
        <TouchableOpacity
          key={routine.id}
          style={[styles.card, activeCat && { borderColor: `${activeCat.color}30` }]}
          onPress={() => router.push(`/library/${routine.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { fontFamily: FONTS.bodyBold }]}>
                {routine.title}
              </Text>
              {routine.durationMin != null && (
                <View style={[styles.durationBadge, activeCat && { borderColor: `${activeCat.color}40` }]}>
                  <Feather name="clock" size={11} color={activeCat?.color ?? COLORS.textMuted} />
                  <Text style={[styles.durationText, { fontFamily: FONTS.mono, color: activeCat?.color ?? COLORS.textMuted }]}>
                    {routine.durationMin} min
                  </Text>
                </View>
              )}
            </View>
            {routine.description != null && (
              <Text style={[styles.cardDesc, { fontFamily: FONTS.body }]} numberOfLines={2}>
                {routine.description}
              </Text>
            )}
          </View>
          <View style={styles.cardFooter}>
            <Text style={[styles.exerciseCount, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
              {routine.exercises.length} exercice{routine.exercises.length !== 1 ? "s" : ""}
            </Text>
            <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      ))}

      {!isLoading && filtered.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            Aucune routine disponible dans cette catégorie.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 28, color: COLORS.white, letterSpacing: 3 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
  categoryTabs: { flexDirection: "row", gap: 8, paddingRight: 4 },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13 },
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
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  cardTop: { gap: 6 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 15, color: COLORS.white, flex: 1 },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationText: { fontSize: 11 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exerciseCount: { fontSize: 12, letterSpacing: 0.5 },
  emptyBox: { paddingVertical: 32, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
});
