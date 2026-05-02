import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { InputField } from "@/components/ui/InputField";
import { GradientButton } from "@/components/ui/GradientButton";
const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const formOpacity = useSharedValue(1);
  const formStyle = useAnimatedStyle(() => ({ opacity: formOpacity.value }));

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMsg("L'adresse email est requise");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Une erreur est survenue. Réessaie.");
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
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: FONTS.title }]}>MOT DE PASSE</Text>
          <Text style={[styles.titleSub, { fontFamily: FONTS.title, color: COLORS.cyan }]}>OUBLIÉ</Text>
        </View>

        {status === "sent" ? (
          <Animated.View style={[styles.successCard, formStyle]}>
            <Feather name="check-circle" size={48} color={COLORS.green} />
            <Text style={[styles.successTitle, { fontFamily: FONTS.bodySemiBold }]}>Email envoyé !</Text>
            <Text style={[styles.successText, { fontFamily: FONTS.body }]}>
              Si un compte existe avec cette adresse, tu recevras un lien de réinitialisation dans quelques minutes. Vérifie aussi tes spams.
            </Text>
            <Pressable onPress={() => router.replace("/auth/login")} style={styles.backToLogin}>
              <Text style={[styles.backToLoginText, { fontFamily: FONTS.bodySemiBold, color: COLORS.cyan }]}>
                Retour à la connexion
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.form, formStyle]}>
            <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
              Saisis ton adresse email. Tu recevras un lien pour choisir un nouveau mot de passe.
            </Text>
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {status === "error" && errorMsg ? (
              <View style={styles.errorWrap}>
                <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{errorMsg}</Text>
              </View>
            ) : null}
            <GradientButton
              label="ENVOYER LE LIEN"
              onPress={handleSubmit}
              loading={status === "loading"}
            />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginLeft: -8,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 52,
    color: COLORS.textPrimary,
    letterSpacing: 6,
    lineHeight: 56,
  },
  titleSub: {
    fontSize: 52,
    letterSpacing: 6,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  form: { gap: 16 },
  errorWrap: {
    backgroundColor: COLORS.redDim,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    textAlign: "center",
  },
  successCard: {
    alignItems: "center",
    gap: 16,
    paddingTop: 16,
  },
  successTitle: {
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  successText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  backToLogin: {
    marginTop: 8,
    padding: 12,
  },
  backToLoginText: {
    fontSize: 15,
  },
});
