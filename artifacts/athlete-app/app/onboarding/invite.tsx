import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { resolveMediaUrl } from "@/lib/custom-fetch";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";
import { useGetCoaches, useRequestCoach } from "@workspace/api-client-react";
import type { CoachSummary } from "@workspace/api-client-react";
import { useT } from "@/context/PreferencesContext";

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { data: coaches, isLoading } = useGetCoaches();
  const requestMutation = useRequestCoach();
  const [selectedCoachId, setSelectedCoachId] = React.useState<string | null>(null);
  const [requested, setRequested] = React.useState(false);
  const [requestedCoach, setRequestedCoach] = React.useState<CoachSummary | null>(null);
  const [error, setError] = React.useState("");

  const handleRequest = async () => {
    if (!selectedCoachId) return;
    setError("");
    const coach = coaches?.find(c => c.id === selectedCoachId) ?? null;
    try {
      await requestMutation.mutateAsync({ coachId: selectedCoachId });
      setRequestedCoach(coach);
      setRequested(true);
    } catch {
      setError("Une erreur est survenue. Réessaie.");
    }
  };

  if (requested && requestedCoach) {
    return (
      <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepIndicator}>
            <Text style={[styles.step, { fontFamily: FONTS.mono }]}>04 / 05</Text>
          </View>
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Feather name="send" size={36} color={COLORS.cyan} />
            </View>
            <Text style={[styles.successTitle, { fontFamily: FONTS.bodyBold }]}>
              {t("invite_sent", "Demande envoyée !")}
            </Text>
            <Text style={[styles.successDesc, { fontFamily: FONTS.body }]}>
              Ta demande a été envoyée à{" "}
              <Text style={{ color: COLORS.cyan }}>
                {requestedCoach.firstName} {requestedCoach.lastName ?? ""}
              </Text>
              . Tu seras connecté(e) dès que ton coach aura accepté.
            </Text>
            <GradientButton label={t("onboarding_continue", "Continuer")} onPress={() => router.push("/onboarding/tutorial")} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepIndicator}>
          <Text style={[styles.step, { fontFamily: FONTS.mono }]}>04 / 05</Text>
        </View>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("choose_coach", "CHOISIR UN COACH")}</Text>
        <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
          {t("choose_coach_subtitle", "Sélectionne ton coach ci-dessous pour envoyer une demande de connexion.")}
        </Text>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.cyan} />
          </View>
        ) : (coaches ?? []).length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
              Aucun coach disponible pour le moment.
            </Text>
          </View>
        ) : (
          <View style={styles.coachList}>
            {(coaches ?? []).map(coach => {
              const selected = selectedCoachId === coach.id;
              return (
                <TouchableOpacity
                  key={coach.id}
                  style={[styles.coachCard, selected && styles.coachCardSelected]}
                  onPress={() => setSelectedCoachId(coach.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.coachAvatar}>
                    {coach.avatarUrl ? (
                      <Image source={{ uri: resolveMediaUrl(coach.avatarUrl) }} style={styles.coachAvatarImg} />
                    ) : (
                      <Text style={[styles.coachAvatarInitials, { fontFamily: FONTS.bodyBold }]}>
                        {coach.firstName[0]}{coach.lastName?.[0] ?? ""}
                      </Text>
                    )}
                  </View>
                  <View style={styles.coachInfo}>
                    <Text style={[styles.coachName, { fontFamily: FONTS.bodyBold, color: selected ? COLORS.cyan : COLORS.white }]}>
                      {coach.firstName} {coach.lastName}
                    </Text>
                    <Text style={[styles.coachRole, { fontFamily: FONTS.mono }]}>COACH ADAPT</Text>
                  </View>
                  {selected && (
                    <Feather name="check-circle" size={20} color={COLORS.cyan} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {error ? (
          <Text style={[styles.error, { fontFamily: FONTS.body }]}>{error}</Text>
        ) : null}

        <View style={styles.actions}>
          <GradientButton
            label={t("send_request", "Envoyer la demande")}
            onPress={handleRequest}
            loading={requestMutation.isPending}
            disabled={!selectedCoachId}
          />
          <TouchableOpacity
            onPress={() => router.push("/onboarding/tutorial")}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipText, { fontFamily: FONTS.body }]}>{t("skip_for_now", "Passer pour l'instant")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  stepIndicator: { marginBottom: 16 },
  step: { fontSize: 13, color: COLORS.cyan, letterSpacing: 2 },
  title: { fontSize: 48, color: COLORS.white, letterSpacing: 4, lineHeight: 52 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, marginBottom: 28 },
  loadingBox: { alignItems: "center", paddingVertical: 40 },
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  coachList: { gap: 12, marginBottom: 28 },
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  coachCardSelected: {
    borderColor: COLORS.cyan,
    backgroundColor: "rgba(0,240,255,0.07)",
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coachAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  coachAvatarInitials: { fontSize: 18, color: COLORS.white },
  coachInfo: { flex: 1 },
  coachName: { fontSize: 16, marginBottom: 2 },
  coachRole: { fontSize: 10, color: COLORS.cyan, letterSpacing: 2 },
  error: { color: COLORS.red, fontSize: 13, textAlign: "center", marginBottom: 12 },
  actions: { gap: 12 },
  successBox: { alignItems: "center", gap: 18, paddingVertical: 40 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, color: COLORS.white },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
  skipBtn: { alignItems: "center", padding: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },
});
