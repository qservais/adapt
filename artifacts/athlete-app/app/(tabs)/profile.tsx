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
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/Button";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout, updateUser } = useAuth();
  const meQuery = useGetMe();
  const updateMutation = useUpdateMe();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [cycleTracking, setCycleTracking] = useState(user?.cycleTracking ?? false);

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
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      Alert.alert("Error", msg);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const profile = meQuery.data ?? user;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: tabBarHeight + 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>PROFILE</Text>
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
            {(profile?.role ?? "ATHLETE").toUpperCase()}
          </Text>
        </View>
      </View>

      {profile != null && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold }]}>
              {profile.age ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body }]}>Age</Text>
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
            EDIT PROFILE
          </Text>
          <InputField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { fontFamily: FONTS.bodyMedium }]}>
                Cycle Tracking
              </Text>
              <Text style={[styles.switchDesc, { fontFamily: FONTS.body }]}>
                Adds cycle phase context to check-ins
              </Text>
            </View>
            <Switch
              value={cycleTracking}
              onValueChange={setCycleTracking}
              trackColor={{ false: COLORS.border, true: COLORS.greenDim }}
              thumbColor={cycleTracking ? COLORS.green : COLORS.textMuted}
            />
          </View>
          <Button label="Save Changes" onPress={handleSave} loading={updateMutation.isPending} />
        </GlowCard>
      ) : (
        <View style={styles.infoSection}>
          {profile?.fitnessLevel != null && (
            <View style={styles.infoRow}>
              <Feather name="activity" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Level</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
                {profile.fitnessLevel.charAt(0).toUpperCase() + profile.fitnessLevel.slice(1)}
              </Text>
            </View>
          )}
          {profile?.primaryGoal != null && (
            <View style={styles.infoRow}>
              <Feather name="target" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>Goal</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
                {profile.primaryGoal.replace(/_/g, " ")}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Feather name="refresh-cw" size={16} color={COLORS.textMuted} />
            <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>
              Cycle Tracking
            </Text>
            <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium }]}>
              {profile?.cycleTracking ? "On" : "Off"}
            </Text>
          </View>
          {profile?.inviteCode != null && (
            <View style={styles.infoRow}>
              <Feather name="link" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body }]}>
                Invite Code
              </Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.mono }]}>
                {profile.inviteCode}
              </Text>
            </View>
          )}
        </View>
      )}

      <Pressable onPress={handleLogout} style={styles.logoutBtn}>
        <Feather name="log-out" size={18} color={COLORS.red} />
        <Text style={[styles.logoutText, { fontFamily: FONTS.bodyMedium }]}>
          Sign Out
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
    marginBottom: 24,
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
