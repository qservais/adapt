import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useUpdateMe, useAthleteLink } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout, updateUser } = useAuth();
  const meQuery = useGetMe();
  const updateMutation = useUpdateMe();
  const linkMutation = useAthleteLink();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [cycleTracking, setCycleTracking] = useState(user?.cycleTracking ?? false);

  const [coachCode, setCoachCode] = useState("");
  const [coachLinkError, setCoachLinkError] = useState("");
  const [coachLinked, setCoachLinked] = useState(false);

  const handleSave = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        data: {
          firstName: firstName.trim() || undefined,
          cycleTracking,
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

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: tabBarHeight + 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>PROFIL</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editBtn}>
          <Feather name={editing ? "x" : "edit-2"} size={20} color={COLORS.green} />
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
                color: profile?.role === "coach" ? COLORS.violet : COLORS.green,
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
              {profile.age ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Âge</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
              {profile.weightKg ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>kg</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
              {profile.heightCm ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>cm</Text>
          </View>
        </View>
      )}

      {editing ? (
        <GlowCard glowColor={COLORS.green} style={styles.editCard}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>
            MODIFIER LE PROFIL
          </Text>
          <InputField
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
          />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { fontFamily: FONTS.bodyMedium }]}>
                Suivi du cycle
              </Text>
              <Text style={[styles.switchDesc, { fontFamily: FONTS.body }]}>
                Ajoute le contexte cycle à tes check-ins (athlètes féminines)
              </Text>
            </View>
            <Switch
              value={cycleTracking}
              onValueChange={setCycleTracking}
              trackColor={{ false: COLORS.border, true: COLORS.greenDim }}
              thumbColor={cycleTracking ? COLORS.green : COLORS.textMuted}
            />
          </View>
          <Button label="Enregistrer" onPress={handleSave} loading={updateMutation.isPending} />
        </GlowCard>
      ) : (
        <View style={styles.infoSection}>
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
          <View style={styles.infoRow}>
            <Feather name="refresh-cw" size={16} color={COLORS.textMuted} />
            <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>
              Suivi du cycle
            </Text>
            <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
              {profile?.cycleTracking ? "Activé" : "Désactivé"}
            </Text>
          </View>
          {profile?.inviteCode != null && (
            <View style={styles.infoRow}>
              <Feather name="link" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>
                Code coach
              </Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.mono }]}>
                {profile.inviteCode}
              </Text>
            </View>
          )}
          {hasCoach && (
            <View style={styles.infoRow}>
              <Feather name="users" size={16} color={COLORS.green} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Coach</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: COLORS.green }]}>
                Connecté
              </Text>
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
              <Feather name="check-circle" size={20} color={COLORS.green} />
              <Text style={[styles.linkedText, { fontFamily: FONTS.bodyMedium, color: COLORS.green }]}>
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
              <Button
                label="Connecter"
                onPress={handleLinkCoach}
                loading={linkMutation.isPending}
              />
            </>
          )}
        </GlowCard>
      )}

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
  avatarSection: { alignItems: "center", marginBottom: 28, gap: 8 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.greenDim,
    borderWidth: 2,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 38, color: COLORS.green },
  displayName: { fontSize: 22, color: COLORS.white },
  email: { fontSize: 13, color: COLORS.textMuted },
  roleBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenDim,
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
  logoutText: { fontSize: 15, color: COLORS.red },
});
