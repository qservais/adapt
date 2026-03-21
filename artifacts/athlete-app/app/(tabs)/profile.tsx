import React, { useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useUpdateMe, useAthleteLink, useGetBadges, customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { useScrollToTop } from "@react-navigation/native";
import { GlowCard } from "@/components/ui/GlowCard";
import { InputField } from "@/components/ui/InputField";
import { GradientButton } from "@/components/ui/GradientButton";
import DateTimePicker from "@react-native-community/datetimepicker";

const GOAL_LABELS: Record<string, string> = {
  strength: "Force",
  muscle: "Prise de masse",
  fat_loss: "Perte de poids",
  performance: "Performance",
  health: "Santé",
  aesthetic: "Esthétique",
  fitness: "Fitness",
};

const FITNESS_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const GENDER_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
};

function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const { user, logout, updateUser } = useAuth();
  const meQuery = useGetMe();
  const updateMutation = useUpdateMe();
  const linkMutation = useAthleteLink();
  const queryClient = useQueryClient();
  const badgesQuery = useGetBadges();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [gender, setGender] = useState<string>(user?.gender ?? "");
  const [cycleTracking, setCycleTracking] = useState(user?.cycleTracking ?? false);
  const [weight, setWeight] = useState<string>("");
  const [birthDateValue, setBirthDateValue] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [coachCode, setCoachCode] = useState("");
  const [coachLinkError, setCoachLinkError] = useState("");
  const [coachLinked, setCoachLinked] = useState(false);

  const startEditing = () => {
    const p = meQuery.data ?? user;
    setFirstName(p?.firstName ?? "");
    setGender(p?.gender ?? "");
    setCycleTracking(p?.cycleTracking ?? false);
    setWeight(p?.weightKg ? String(Math.round(parseFloat(String(p.weightKg)))) : "");
    if (p?.birthDate) {
      setBirthDateValue(new Date(String(p.birthDate).substring(0, 10) + "T12:00:00"));
    } else {
      setBirthDateValue(null);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    const parsedWeight = parseFloat(weight);
    let birthDateStr: string | undefined;
    if (birthDateValue != null) {
      const y = birthDateValue.getFullYear();
      const m = String(birthDateValue.getMonth() + 1).padStart(2, "0");
      const d = String(birthDateValue.getDate()).padStart(2, "0");
      birthDateStr = `${y}-${m}-${d}`;
    }
    try {
      const updated = await updateMutation.mutateAsync({
        data: {
          firstName: firstName.trim() || undefined,
          gender: (gender as "homme" | "femme") || undefined,
          cycleTracking,
          weightKg: !isNaN(parsedWeight) && parsedWeight >= 20 ? parsedWeight : undefined,
          birthDate: birthDateStr,
        },
      });
      updateUser(updated);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de mettre à jour le profil";
      Alert.alert("Erreur", msg);
    }
  };

  const handleUnlinkCoach = () => {
    Alert.alert(
      "Délier le coach",
      "Es-tu sûr(e) de vouloir te délier de ton coach ? Tu ne recevras plus de programmes personnalisés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Délier",
          style: "destructive",
          onPress: async () => {
            try {
              await customFetch("/api/users/me/coach", { method: "DELETE" });
              queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
            } catch {
              Alert.alert("Erreur", "Impossible de délier le coach");
            }
          },
        },
      ]
    );
  };

  const handleLinkCoach = async () => {
    setCoachLinkError("");
    const trimmed = coachCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setCoachLinkError("Entre le code à 6 caractères donné par ton coach");
      return;
    }
    try {
      await linkMutation.mutateAsync({ data: { inviteCode: trimmed } });
      setCoachLinked(true);
      setCoachCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Code invalide";
      setCoachLinkError(msg);
    }
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Es-tu sûr(e) de vouloir te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const profile = meQuery.data ?? user;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const hasCoach = profile?.coachId != null;
  const profileGender = profile?.gender;
  const showCycleTracking = profileGender !== "homme";
  const displayAge = computeAge(profile?.birthDate) ?? profile?.age;
  const trainingFreq = profile?.trainingFrequency;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>PROFIL</Text>
        <TouchableOpacity onPress={editing ? () => setEditing(false) : startEditing} style={styles.editBtn}>
          <Feather name={editing ? "x" : "edit-2"} size={20} color={COLORS.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={[styles.initials, { fontFamily: FONTS.title }]}>
            {(profile?.firstName?.[0] ?? "A").toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.displayName, { fontFamily: FONTS.bodyBold }]}>
          {profile?.firstName} {profile?.lastName ?? ""}
        </Text>
        <Text style={[styles.email, { fontFamily: FONTS.mono }]}>{profile?.email}</Text>
        <View
          style={[
            styles.roleBadge,
            profile?.role === "coach" && { borderColor: COLORS.violet, backgroundColor: COLORS.violetDim },
          ]}
        >
          <Text
            style={[
              styles.roleText,
              {
                fontFamily: FONTS.mono,
                color: profile?.role === "coach" ? COLORS.violet : COLORS.cyan,
              },
            ]}
          >
            {profile?.role === "coach" ? "COACH" : "ATHLÈTE"}
          </Text>
        </View>
      </View>

      {profile != null && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
              {displayAge ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Âge</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
              {profile.weightKg != null ? Math.round(parseFloat(String(profile.weightKg))) : "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>kg</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
              {profile.heightCm ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>cm</Text>
          </View>
          {trainingFreq != null && (
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
                {trainingFreq}×
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>/ sem.</Text>
            </View>
          )}
        </View>
      )}

      {editing ? (
        <GlowCard glowColor={COLORS.cyan} style={styles.editCard}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            MODIFIER LE PROFIL
          </Text>
          <InputField
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
          />
          <Text style={[styles.fieldLabel, { fontFamily: FONTS.body }]}>Genre</Text>
          <View style={styles.genderRow}>
            {(["homme", "femme"] as const).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => {
                  setGender(g);
                  if (g === "homme") setCycleTracking(false);
                }}
                style={[
                  styles.genderBtn,
                  gender === g && { borderColor: COLORS.cyan, backgroundColor: COLORS.cyanDim },
                ]}
              >
                <Text style={[
                  styles.genderBtnText,
                  { fontFamily: FONTS.body, color: gender === g ? COLORS.cyan : COLORS.textSecondary },
                ]}>
                  {GENDER_LABELS[g]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {gender !== "homme" && (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { fontFamily: FONTS.bodyMedium }]}>
                  Suivi du cycle
                </Text>
                <Text style={[styles.switchDesc, { fontFamily: FONTS.body }]}>
                  Intègre ta phase cycle dans le score ADAPT
                </Text>
              </View>
              <Switch
                value={cycleTracking}
                onValueChange={setCycleTracking}
                trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
                thumbColor={cycleTracking ? COLORS.cyan : COLORS.textMuted}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <InputField
              label="Poids (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="ex: 70.5"
            />
          </View>
          <Text style={[styles.fieldLabel, { fontFamily: FONTS.bodyMedium, marginTop: 12, marginBottom: 6 }]}>
            Date de naissance
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.datePicker}
            activeOpacity={0.7}
          >
            <Feather name="calendar" size={16} color={COLORS.cyan} />
            <Text style={[styles.datePickerText, { fontFamily: FONTS.body, color: birthDateValue ? COLORS.white : COLORS.textMuted }]}>
              {birthDateValue
                ? birthDateValue.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                : "Sélectionner une date"}
            </Text>
            <Feather name="chevron-down" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDateValue ?? new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date(new Date().getFullYear() - 5, 11, 31)}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(_event, date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (date) setBirthDateValue(date);
              }}
            />
          )}
          <GradientButton label="Enregistrer" onPress={handleSave} loading={updateMutation.isPending} />
        </GlowCard>
      ) : (
        <View style={styles.infoSection}>
          {profileGender != null && (
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Genre</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
                {GENDER_LABELS[profileGender] ?? profileGender}
              </Text>
            </View>
          )}
          {profile?.fitnessLevel != null && (
            <View style={styles.infoRow}>
              <Feather name="activity" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Niveau</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
                {FITNESS_LABELS[profile.fitnessLevel] ?? profile.fitnessLevel}
              </Text>
            </View>
          )}
          {profile?.primaryGoal != null && (
            <View style={styles.infoRow}>
              <Feather name="target" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Objectif</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
                {GOAL_LABELS[profile.primaryGoal] ?? profile.primaryGoal.replace(/_/g, " ")}
              </Text>
            </View>
          )}
          {showCycleTracking && (
            <View style={styles.infoRow}>
              <Feather name="refresh-cw" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>
                Suivi du cycle
              </Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
                {profile?.cycleTracking ? "Activé" : "Désactivé"}
              </Text>
            </View>
          )}
          {profile?.inviteCode != null && (
            <View style={styles.infoRow}>
              <Feather name="link" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>
                Code d'invitation
              </Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.mono }]}>
                {profile.inviteCode}
              </Text>
            </View>
          )}
          {hasCoach && (
            <View style={[styles.infoRow, { flexWrap: "wrap", gap: 8 }]}>
              <Feather name="users" size={16} color={COLORS.cyan} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Coach</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: COLORS.cyan, flex: 1 }]}>
                {(profile as any)?.coachName ?? "Connecté"}
              </Text>
              <TouchableOpacity onPress={handleUnlinkCoach} style={styles.unlinkBtn} activeOpacity={0.7}>
                <Text style={[styles.unlinkText, { fontFamily: FONTS.mono }]}>Délier</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!hasCoach && (
        <GlowCard glowColor={COLORS.cyan} style={styles.coachSection}>
          <View style={styles.coachHeader}>
            <Feather name="users" size={18} color={COLORS.cyan} />
            <Text style={[styles.coachTitle, { fontFamily: FONTS.mono }]}>
              CONNECTER UN COACH
            </Text>
          </View>
          <Text style={[styles.coachDesc, { fontFamily: FONTS.body }]}>
            Ton coach t'a fourni un code à 6 caractères. Entre-le ci-dessous pour relier ton compte.
          </Text>
          {coachLinked ? (
            <View style={styles.linkedRow}>
              <Feather name="check-circle" size={20} color={COLORS.cyan} />
              <Text style={[styles.linkedText, { fontFamily: FONTS.bodyMedium, color: COLORS.cyan }]}>
                Coach connecté avec succès !
              </Text>
            </View>
          ) : (
            <>
              <InputField
                label="Code d'invitation"
                value={coachCode}
                onChangeText={(t) => setCoachCode(t.toUpperCase())}
                placeholder="ABC123"
                autoCapitalize="characters"
              />
              {coachLinkError ? (
                <Text style={[styles.linkError, { fontFamily: FONTS.body }]}>
                  {coachLinkError}
                </Text>
              ) : null}
              <GradientButton
                label="Connecter"
                onPress={handleLinkCoach}
                loading={linkMutation.isPending}
              />
            </>
          )}
        </GlowCard>
      )}

      <View style={styles.quickLinks}>
        <TouchableOpacity
          onPress={() => router.push("/badges")}
          style={styles.quickLinkRow}
          activeOpacity={0.7}
        >
          <View style={styles.quickLinkLeft}>
            <Text style={styles.quickLinkIcon}>🏅</Text>
            <View>
              <Text style={[styles.quickLinkTitle, { fontFamily: FONTS.bodyMedium }]}>Mes badges</Text>
              {(badgesQuery.data?.unlockedCount ?? 0) > 0 && (
                <Text style={[styles.quickLinkSub, { fontFamily: FONTS.body }]}>
                  {badgesQuery.data?.unlockedCount} / {badgesQuery.data?.total} débloqués
                </Text>
              )}
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={[styles.quickLinkRow, styles.quickLinkDisabled]}>
          <View style={styles.quickLinkLeft}>
            <Text style={styles.quickLinkIcon}>❤️</Text>
            <View>
              <Text style={[styles.quickLinkTitle, { fontFamily: FONTS.bodyMedium, color: COLORS.textMuted }]}>
                Apple Santé
              </Text>
              <Text style={[styles.quickLinkSub, { fontFamily: FONTS.body, color: COLORS.textMuted }]}>
                Bientôt disponible
              </Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={[styles.comingSoonText, { fontFamily: FONTS.mono }]}>BIENTÔT</Text>
          </View>
        </View>
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutBtn}>
        <Feather name="log-out" size={18} color={COLORS.red} />
        <Text style={[styles.logoutText, { fontFamily: FONTS.bodyMedium }]}>
          Se déconnecter
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  screenTitle: { fontSize: 44, color: COLORS.white, letterSpacing: 5 },
  editBtn: { padding: 8 },
  rowInputs: { flexDirection: "row", gap: 12 },
  avatarSection: { alignItems: "center", marginBottom: 28, gap: 8 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 2,
    borderColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 38, color: COLORS.cyan },
  displayName: { fontSize: 22, color: COLORS.white },
  email: { fontSize: 13, color: COLORS.textMuted },
  roleBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  roleText: { fontSize: 11, letterSpacing: 2 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  statItem: { alignItems: "center", gap: 4 },
  statVal: { fontSize: 24, color: COLORS.white },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  editCard: { gap: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: "center",
  },
  genderBtnText: { fontSize: 14 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 15, color: COLORS.white, marginBottom: 2 },
  switchDesc: { fontSize: 12, color: COLORS.textMuted },
  infoSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  infoVal: { fontSize: 14, color: COLORS.white },
  coachSection: { gap: 14, marginBottom: 24 },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  coachTitle: { fontSize: 11, color: COLORS.cyan, letterSpacing: 2 },
  coachDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  linkedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkedText: { fontSize: 15 },
  linkError: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  quickLinks: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  quickLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickLinkDisabled: { opacity: 0.6 },
  quickLinkLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  quickLinkIcon: { fontSize: 22 },
  quickLinkTitle: { fontSize: 15, color: COLORS.white },
  quickLinkSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comingSoonText: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.redDim,
    backgroundColor: COLORS.redDim,
  },
  logoutText: { fontSize: 16, color: COLORS.red },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePickerText: { flex: 1, fontSize: 15 },
  unlinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.redDim,
    backgroundColor: COLORS.redDim,
  },
  unlinkText: { fontSize: 11, color: COLORS.red, letterSpacing: 1 },
});
