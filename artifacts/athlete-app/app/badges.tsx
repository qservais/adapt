import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetBadges } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import type { BadgeItem } from "@workspace/api-client-react";

const CATEGORY_LABELS: Record<string, string> = {
  special: "Spécial",
  streak: "Streak",
  sessions: "Séances",
  pr: "Records",
};

const CATEGORY_ORDER = ["special", "streak", "sessions", "pr"];

const CATEGORY_COLORS: Record<string, string> = {
  special: COLORS.cyan,
  streak: COLORS.amber,
  sessions: COLORS.violet,
  pr: COLORS.green,
};

function BadgeCard({ badge }: { badge: BadgeItem }) {
  const accentColor = CATEGORY_COLORS[badge.category] ?? COLORS.cyan;

  return (
    <View
      style={[
        styles.badgeCard,
        badge.unlocked
          ? { borderColor: accentColor, backgroundColor: `${accentColor}18` }
          : styles.badgeLocked,
      ]}
    >
      <Text style={[styles.badgeIcon, badge.unlocked ? {} : styles.lockedOpacity]}>
        {badge.icon}
      </Text>
      <Text
        style={[
          styles.badgeName,
          { fontFamily: FONTS.bodyMedium },
          badge.unlocked ? { color: COLORS.white } : { color: COLORS.textMuted },
        ]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      {badge.unlocked && badge.unlockedAt && (
        <Text style={[styles.badgeDate, { fontFamily: FONTS.mono }]}>
          {new Date(badge.unlockedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
        </Text>
      )}
      {!badge.unlocked && (
        <View style={styles.lockIcon}>
          <Feather name="lock" size={10} color={COLORS.textMuted} />
        </View>
      )}
    </View>
  );
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const badgesQuery = useGetBadges();

  const badges = badgesQuery.data?.badges ?? [];
  const unlockedCount = badgesQuery.data?.unlockedCount ?? 0;
  const total = badgesQuery.data?.total ?? 0;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const grouped: Record<string, BadgeItem[]> = {};
  for (const b of badges) {
    if (!grouped[b.category]) grouped[b.category] = [];
    grouped[b.category].push(b);
  }

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>MES BADGES</Text>
        <View style={styles.counter}>
          <Text style={[styles.counterText, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
            {unlockedCount}
          </Text>
          <Text style={[styles.counterSep, { fontFamily: FONTS.mono, color: COLORS.textSecondary }]}>
            /{total}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORY_ORDER.map(cat => {
          const catBadges = grouped[cat];
          if (!catBadges?.length) return null;
          const color = CATEGORY_COLORS[cat] ?? COLORS.cyan;
          return (
            <View key={cat} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: color }]} />
                <Text style={[styles.sectionTitle, { fontFamily: FONTS.bodyBold, color }]}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </Text>
              </View>
              <View style={styles.grid}>
                {catBadges.map(b => <BadgeCard key={b.code} badge={b} />)}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 28, color: COLORS.white, letterSpacing: 2 },
  counter: { flexDirection: "row", alignItems: "baseline" },
  counterText: { fontSize: 20 },
  counterSep: { fontSize: 14 },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, letterSpacing: 1, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeCard: {
    width: "30.5%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    padding: 12,
    alignItems: "center",
    gap: 6,
    minHeight: 100,
    justifyContent: "center",
  },
  badgeLocked: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  badgeIcon: { fontSize: 28 },
  lockedOpacity: { opacity: 0.35 },
  badgeName: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  badgeDate: { fontSize: 10, color: COLORS.textMuted },
  lockIcon: { position: "absolute", top: 8, right: 8 },
});
