import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetAthleteCoachSlots, useCreateOneOnOneRequest } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT } from "@/context/PreferencesContext";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export default function OneOnOneScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, i));
  const [selectedDate, setSelectedDate] = useState(days[0]!);
  const [requestingTime, setRequestingTime] = useState<string | null>(null);

  const dateStr = toDateStr(selectedDate);
  const { data: slots, isLoading, refetch } = useGetAthleteCoachSlots(
    { date: dateStr },
    { query: { queryKey: ["/api/athlete/coach-slots", dateStr] } }
  );
  const requestMutation = useCreateOneOnOneRequest();

  const handleRequest = async (time: string) => {
    if (requestingTime) return;
    setRequestingTime(time);
    try {
      await requestMutation.mutateAsync({ data: { date: dateStr, time } });
      Alert.alert(
        t("request_sent_title", "Demande envoyée"),
        t("request_sent_desc", "Ton coach va confirmer ce créneau prochainement.")
      );
      refetch();
    } catch {
      Alert.alert(t("error", "Erreur"), t("request_failed", "Impossible d'envoyer la demande. Réessaie."));
    } finally {
      setRequestingTime(null);
    }
  };

  const list = slots ?? [];

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
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("one_on_one_uc", "RENDEZ-VOUS 1:1")}</Text>
      </View>

      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        {t("one_on_one_subtitle", "Choisis une date, puis un créneau disponible. Ton coach confirmera ta demande.")}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {days.map((d) => {
          const active = toDateStr(d) === dateStr;
          return (
            <TouchableOpacity
              key={d.toISOString()}
              onPress={() => setSelectedDate(d)}
              style={[styles.dayChip, active && styles.dayChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayChipWeekday, { fontFamily: FONTS.mono, color: active ? COLORS.bg : COLORS.textMuted }]}>
                {d.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase()}
              </Text>
              <Text style={[styles.dayChipNum, { fontFamily: FONTS.bodyBold, color: active ? COLORS.bg : COLORS.white }]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={COLORS.violet} />
        </View>
      )}

      {!isLoading && list.length === 0 && (
        <View style={styles.emptyBox}>
          <Feather name="calendar" size={28} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            {t("no_slots_available", "Aucun créneau disponible ce jour-là.")}
          </Text>
        </View>
      )}

      {!isLoading && list.length > 0 && (
        <View style={styles.slotsGrid}>
          {list.map((slot) => {
            const busy = requestingTime === slot.startTime;
            return (
              <TouchableOpacity
                key={slot.id}
                onPress={() => handleRequest(slot.startTime)}
                disabled={!!requestingTime}
                style={[styles.slotChip, { opacity: requestingTime && !busy ? 0.5 : 1 }]}
                activeOpacity={0.8}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={COLORS.violet} />
                ) : (
                  <Text style={[styles.slotText, { fontFamily: FONTS.bodyBold }]}>{slot.startTime}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, color: COLORS.white, letterSpacing: 1.5 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  dayRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  dayChip: {
    width: 52,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  dayChipActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  dayChipWeekday: { fontSize: 10 },
  dayChipNum: { fontSize: 16 },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotChip: {
    minWidth: 80,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${COLORS.violet}50`,
    backgroundColor: `${COLORS.violet}15`,
  },
  slotText: { fontSize: 14, color: COLORS.violet },
});
