import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";
import { useAthleteLink } from "@/lib/useAthleteLink";

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const linkMutation = useAthleteLink();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [linked, setLinked] = useState(false);

  const handleLink = async () => {
    setError("");
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Please enter the 6-character code from your coach");
      return;
    }
    try {
      await linkMutation.mutateAsync({ inviteCode: trimmed });
      setLinked(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid invite code";
      setError(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepIndicator}>
          <Text style={[styles.step, { fontFamily: FONTS.mono }]}>04 / 05</Text>
        </View>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>COACH LINK</Text>
        <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
          Enter the 6-character invite code given to you by your coach.
        </Text>

        {linked ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Feather name="check-circle" size={40} color={COLORS.green} />
            </View>
            <Text style={[styles.successTitle, { fontFamily: FONTS.bodyBold }]}>
              Coach Linked!
            </Text>
            <Text style={[styles.successDesc, { fontFamily: FONTS.body }]}>
              Your coach is now connected and can view your sessions and check-ins.
            </Text>
            <Button label="Continue" onPress={() => router.push("/onboarding/tutorial")} />
          </View>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color={COLORS.cyan} />
              <Text style={[styles.infoText, { fontFamily: FONTS.body }]}>
                Your coach can find their invite code in the ADAPT coach dashboard under their profile settings.
              </Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="6-Character Invite Code"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="ABC123"
                autoCapitalize="characters"
                maxLength={6}
                style={styles.codeInput}
              />
              <Text style={[styles.codeHint, { fontFamily: FONTS.mono }]}>
                {code.length}/6 characters
              </Text>
              {error ? (
                <Text style={[styles.error, { fontFamily: FONTS.body }]}>{error}</Text>
              ) : null}
              <Button
                label="Link Coach"
                onPress={handleLink}
                loading={linkMutation.isPending}
              />
              <Button
                label="Skip for now"
                onPress={() => router.push("/onboarding/tutorial")}
                variant="ghost"
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  stepIndicator: { marginBottom: 16 },
  step: { fontSize: 13, color: COLORS.green, letterSpacing: 2 },
  title: { fontSize: 48, color: COLORS.white, letterSpacing: 4, lineHeight: 52 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, marginBottom: 24 },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    padding: 16,
    marginBottom: 28,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  form: { gap: 14 },
  codeInput: { letterSpacing: 8, textAlign: "center", fontSize: 22 },
  codeHint: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
  error: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  successBox: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 22, color: COLORS.white },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center" },
});
