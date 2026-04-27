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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { customFetch, useGetTodaySession } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";

interface Routine {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number | null;
  exercises: { name: string; sets?: string; notes?: string }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  warmup: COLORS.amber,
  reathletisation: COLORS.cyan,
  relaxation: COLORS.violet,
  breathing: COLORS.green,
};

const CATEGORY_LABELS: Record<string, string> = {
  warmup: "Échauffement",
  reathletisation: "Réathlétisation",
  relaxation: "Relaxation",
  breathing: "Respiration",
};

export default function RoutineDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const params = useLocalSearchParams<{ id: string }>();

  const { data: routine, isLoading, error } = useQuery<Routine>({
    queryKey: ["/api/content-routines", params.id],
    queryFn: () => customFetch(`/api/content-routines/${params.id}`),
    enabled: params.id != null,
  });

  const sessionQuery = useGetTodaySession();
  const hasSession = sessionQuery.data != null;

  const accentColor = routine ? (CATEGORY_COLORS[routine.category] ?? COLORS.cyan) : COLORS.cyan;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + (hasSession ? 100 : 40),
          paddingHorizontal: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          <Text style={[styles.backText, { fontFamily: FONTS.body }]}>Bibliothèque</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.cyan} size="large" />
          </View>
        )}

        {error != null && (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>Routine introuvable.</Text>
          </View>
        )}

        {routine != null && (
          <>
            <View style={styles.heroSection}>
              <Text style={[styles.categoryLabel, { fontFamily: FONTS.mono, color: accentColor }]}>
                {(CATEGORY_LABELS[routine.category] ?? routine.category).toUpperCase()}
              </Text>
              <Text style={[styles.routineTitle, { fontFamily: FONTS.title }]}>
                {routine.title}
              </Text>
              {routine.description != null && (
                <Text style={[styles.description, { fontFamily: FONTS.body }]}>
                  {routine.description}
                </Text>
              )}
              <View style={styles.metaRow}>
                {routine.durationMin != null && (
                  <View style={[styles.metaBadge, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}12` }]}>
                    <Feather name="clock" size={14} color={accentColor} />
                    <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: accentColor }]}>
                      {routine.durationMin} min
                    </Text>
                  </View>
                )}
                <View style={[styles.metaBadge, { borderColor: COLORS.border }]}>
                  <Feather name="list" size={14} color={COLORS.textMuted} />
                  <Text style={[styles.metaText, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
                    {routine.exercises.length} exercice{routine.exercises.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>DÉROULÉ</Text>

            <View style={styles.exerciseList}>
              {routine.exercises.map((ex, idx) => (
                <View key={idx} style={[styles.exerciseCard, { borderLeftColor: accentColor }]}>
                  <View style={styles.exerciseHeader}>
                    <View style={[styles.indexBadge, { backgroundColor: `${accentColor}20` }]}>
                      <Text style={[styles.indexText, { fontFamily: FONTS.monoBold, color: accentColor }]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.exerciseName, { fontFamily: FONTS.bodyBold }]}>
                      {ex.name}
                    </Text>
                  </View>
                  {ex.sets != null && (
                    <View style={styles.exerciseMeta}>
                      <Feather name="repeat" size={12} color={COLORS.textMuted} />
                      <Text style={[styles.exerciseSets, { fontFamily: FONTS.mono }]}>{ex.sets}</Text>
                    </View>
                  )}
                  {ex.notes != null && (
                    <Text style={[styles.exerciseNotes, { fontFamily: FONTS.body }]}>
                      {ex.notes}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {hasSession && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/session")}
            style={styles.sessionBtn}
            activeOpacity={0.85}
          >
            <Feather name="zap" size={20} color={COLORS.bg} />
            <Text style={[styles.sessionBtnText, { fontFamily: FONTS.bodyBold }]}>
              Reprendre ma séance
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  backText: { fontSize: 15, color: COLORS.textSecondary },
  center: { alignItems: "center", paddingVertical: 60 },
  errorBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 14, textAlign: "center" },
  heroSection: { gap: 8 },
  categoryLabel: { fontSize: 11, letterSpacing: 2 },
  routineTitle: { fontSize: 26, color: COLORS.white, letterSpacing: 1 },
  description: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  metaText: { fontSize: 12 },
  divider: { height: 1, backgroundColor: COLORS.border },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  exerciseList: { gap: 10 },
  exerciseCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    padding: 14,
    gap: 6,
  },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontSize: 12 },
  exerciseName: { fontSize: 15, color: COLORS.white, flex: 1 },
  exerciseMeta: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 36 },
  exerciseSets: { fontSize: 12, color: COLORS.textMuted },
  exerciseNotes: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, paddingLeft: 36 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  sessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 16,
  },
  sessionBtnText: {
    fontSize: 16,
    color: COLORS.bg,
  },
});
