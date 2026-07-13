import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetClassOccurrences,
  useBookClass,
  useCancelClassBooking,
  useJoinClassWaitlist,
  useLeaveClassWaitlist,
  useConfirmClassWaitlistOffer,
} from "@workspace/api-client-react";
import type { ClassOccurrenceWithAvailability } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT } from "@/context/PreferencesContext";

function spotsColor(available: number, capacity: number): string {
  if (available <= 0) return COLORS.red;
  if (available / capacity <= 0.25) return COLORS.amber;
  return COLORS.green;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const from = new Date();
  const to = addDays(from, 14);
  const { data: occurrences, isLoading, refetch } = useGetClassOccurrences({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const bookMutation = useBookClass();
  const cancelMutation = useCancelClassBooking();
  const joinWaitlistMutation = useJoinClassWaitlist();
  const leaveWaitlistMutation = useLeaveClassWaitlist();
  const confirmOfferMutation = useConfirmClassWaitlistOffer();
  const [busyId, setBusyId] = useState<string | null>(null);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      refetch();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message =
        status === 409
          ? t("class_full_error", "Ce cours vient de se remplir.")
          : status === 410
          ? t("offer_expired_error", "L'offre de place a expiré.")
          : t("action_failed_error", "Action impossible. Réessaie.");
      Alert.alert(t("error", "Erreur"), message);
    } finally {
      setBusyId(null);
    }
  };

  const handleBook = (occ: ClassOccurrenceWithAvailability) =>
    withBusy(occ.id, async () => { await bookMutation.mutateAsync({ occurrenceId: occ.id }); });

  const handleCancel = (occ: ClassOccurrenceWithAvailability) =>
    withBusy(occ.id, async () => { if (occ.bookingId) await cancelMutation.mutateAsync({ bookingId: occ.bookingId }); });

  const handleJoinWaitlist = (occ: ClassOccurrenceWithAvailability) =>
    withBusy(occ.id, async () => { await joinWaitlistMutation.mutateAsync({ occurrenceId: occ.id }); });

  const handleLeaveWaitlist = (occ: ClassOccurrenceWithAvailability) =>
    withBusy(occ.id, async () => { await leaveWaitlistMutation.mutateAsync({ occurrenceId: occ.id }); });

  const handleConfirmOffer = (occ: ClassOccurrenceWithAvailability) =>
    withBusy(occ.id, async () => { await confirmOfferMutation.mutateAsync({ occurrenceId: occ.id }); });

  const list = (occurrences ?? []).filter((o) => o.status === "scheduled");
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));

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
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("classes_uc", "COURS COLLECTIFS")}</Text>
      </View>

      {isLoading && (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={COLORS.cyan} />
        </View>
      )}

      {!isLoading && list.length === 0 && (
        <View style={styles.emptyBox}>
          <Feather name="calendar" size={28} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            {t("classes_empty", "Aucun cours prévu dans les prochains jours.")}
          </Text>
        </View>
      )}

      {!isLoading && days.map((day) => {
        const dayOccs = list
          .filter((o) => isSameDay(new Date(o.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        if (dayOccs.length === 0) return null;
        return (
          <View key={day.toISOString()} style={{ gap: 8 }}>
            <Text style={[styles.dayLabel, { fontFamily: FONTS.mono }]}>
              {formatDayLabel(day)}
            </Text>
            {dayOccs.map((occ) => {
              const busy = busyId === occ.id;
              return (
                <View key={occ.id} style={styles.classCard}>
                  <View style={styles.classCardTop}>
                    <Text style={[styles.classTime, { fontFamily: FONTS.monoBold }]}>
                      {formatTime(occ.startAt)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.className, { fontFamily: FONTS.bodyBold }]}>{occ.name}</Text>
                      <Text style={[styles.classMeta, { fontFamily: FONTS.body }]}>
                        {occ.durationMin} min{occ.coachFirstName ? ` · ${occ.coachFirstName}` : ""}
                      </Text>
                    </View>
                    <View style={styles.spotsWrap}>
                      <Text style={[styles.spotsText, { fontFamily: FONTS.mono, color: spotsColor(occ.spotsAvailable, occ.capacity) }]}>
                        {occ.spotsAvailable > 0 ? `${occ.spotsAvailable}/${occ.capacity}` : t("full", "Complet")}
                      </Text>
                    </View>
                  </View>

                  {occ.description && (
                    <Text style={[styles.classDesc, { fontFamily: FONTS.body }]} numberOfLines={2}>{occ.description}</Text>
                  )}

                  <View style={styles.actionRow}>
                    {occ.isBooked ? (
                      <TouchableOpacity
                        onPress={() => handleCancel(occ)}
                        disabled={busy}
                        style={[styles.actionBtn, styles.cancelBtn]}
                        activeOpacity={0.85}
                      >
                        {busy ? <ActivityIndicator size="small" color={COLORS.red} /> : (
                          <Text style={[styles.cancelBtnText, { fontFamily: FONTS.bodyBold }]}>{t("cancel_booking", "Annuler ma réservation")}</Text>
                        )}
                      </TouchableOpacity>
                    ) : occ.waitlistStatus === "offered" ? (
                      <TouchableOpacity
                        onPress={() => handleConfirmOffer(occ)}
                        disabled={busy}
                        style={[styles.actionBtn, { backgroundColor: COLORS.amber }]}
                        activeOpacity={0.85}
                      >
                        {busy ? <ActivityIndicator size="small" color={COLORS.bg} /> : (
                          <Text style={[styles.actionBtnText, { fontFamily: FONTS.bodyBold }]}>{t("confirm_spot", "Place offerte — confirmer !")}</Text>
                        )}
                      </TouchableOpacity>
                    ) : occ.waitlistStatus === "waiting" ? (
                      <TouchableOpacity
                        onPress={() => handleLeaveWaitlist(occ)}
                        disabled={busy}
                        style={[styles.actionBtn, styles.waitlistBtn]}
                        activeOpacity={0.85}
                      >
                        {busy ? <ActivityIndicator size="small" color={COLORS.textSecondary} /> : (
                          <Text style={[styles.waitlistBtnText, { fontFamily: FONTS.bodyMedium }]}>{t("leave_waitlist", "Quitter la liste d'attente")}</Text>
                        )}
                      </TouchableOpacity>
                    ) : occ.spotsAvailable > 0 ? (
                      <TouchableOpacity
                        onPress={() => handleBook(occ)}
                        disabled={busy}
                        style={[styles.actionBtn, { backgroundColor: COLORS.cyan }]}
                        activeOpacity={0.85}
                      >
                        {busy ? <ActivityIndicator size="small" color={COLORS.bg} /> : (
                          <Text style={[styles.actionBtnText, { fontFamily: FONTS.bodyBold }]}>
                            {t("book", "Réserver")} ({occ.creditCost} {occ.creditCost > 1 ? t("credits_plural", "crédits") : t("credit_singular", "crédit")})
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleJoinWaitlist(occ)}
                        disabled={busy}
                        style={[styles.actionBtn, styles.waitlistBtn]}
                        activeOpacity={0.85}
                      >
                        {busy ? <ActivityIndicator size="small" color={COLORS.textSecondary} /> : (
                          <Text style={[styles.waitlistBtnText, { fontFamily: FONTS.bodyMedium }]}>{t("join_waitlist", "Rejoindre la liste d'attente")}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, color: COLORS.white, letterSpacing: 2 },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  dayLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, textTransform: "uppercase" },
  classCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  classCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  classTime: { fontSize: 14, color: COLORS.white, width: 44 },
  className: { fontSize: 14, color: COLORS.white },
  classMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  spotsWrap: { alignItems: "flex-end" },
  spotsText: { fontSize: 12 },
  classDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  actionRow: { flexDirection: "row" },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  actionBtnText: { fontSize: 13, color: COLORS.bg },
  cancelBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: `${COLORS.red}50` },
  cancelBtnText: { fontSize: 13, color: COLORS.red },
  waitlistBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: COLORS.border },
  waitlistBtnText: { fontSize: 13, color: COLORS.textSecondary },
});
