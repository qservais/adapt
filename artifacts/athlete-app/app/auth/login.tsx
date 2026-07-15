import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useLoginWithCode } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { getLoginErrorMessage } from "@/lib/errors";
import { GradientButton } from "@/components/ui/GradientButton";
import { InputField } from "@/components/ui/InputField";
import { useT } from "@/context/PreferencesContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const loginMutation = useLoginWithCode();
  const t = useT();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(30);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(20);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoY.value = withTiming(0, { duration: 600 });
    formOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    formY.value = withDelay(300, withTiming(0, { duration: 600 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formY.value }],
  }));

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !/^\d{6}$/.test(code)) {
      setError(t("email_code_required", "L'email et le code à 6 chiffres sont requis"));
      return;
    }
    try {
      const res = await loginMutation.mutateAsync({
        data: { email: email.trim().toLowerCase(), code },
      });
      await login(res.accessToken, res.refreshToken, res.user);
      router.replace("/");
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err));
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
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, logoStyle]}>
          <View style={styles.logoMark}>
            <Text style={[styles.logoMarkLetter, { fontFamily: FONTS.title }]}>A</Text>
          </View>
          <Text style={[styles.logo, { fontFamily: FONTS.title }]}>ADAPT</Text>
          <Text style={[styles.tagline, { fontFamily: FONTS.body }]}>
            {t("auth_tagline", "L'entraînement qui s'adapte à toi.")}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.form, formStyle]}>
          <InputField
            label={t("email", "Email")}
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <InputField
            label={t("login_code", "Ton code à 6 chiffres")}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            keyboardType="number-pad"
            maxLength={6}
            secureToggle
          />
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
                {error}
              </Text>
            </View>
          ) : null}
          <GradientButton
            label={t("sign_in", "Se connecter")}
            onPress={handleLogin}
            loading={loginMutation.isPending}
          />
        </Animated.View>

        <Animated.View style={[styles.footer, formStyle]}>
          <Pressable onPress={() => router.push("/auth/register")}>
            <Text style={[styles.footerText, { fontFamily: FONTS.body }]}>
              {t("no_account_yet", "Pas encore de compte ?")}{" "}
              <Text style={{ color: COLORS.cyan, fontFamily: FONTS.bodySemiBold }}>
                {t("create_account", "Créer un compte")}
              </Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/auth/forgot-password")} style={{ marginTop: 16 }}>
            <Text style={[styles.footerText, { fontFamily: FONTS.body, color: COLORS.textMuted }]}>
              {t("forgot_code", "Code oublié ?")}
            </Text>
          </Pressable>
        </Animated.View>
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
  header: {
    alignItems: "center",
    marginBottom: 64,
  },
  logoMark: {
    width: 52,
    height: 52,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoMarkLetter: {
    fontSize: 36,
    color: COLORS.cyan,
    lineHeight: 40,
    includeFontPadding: false,
  },
  logo: {
    fontSize: 80,
    color: COLORS.cyan,
    letterSpacing: 10,
    lineHeight: 88,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 4,
    marginTop: -6,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 18,
    textAlign: "center",
    lineHeight: 20,
  },
  form: { gap: 16, marginBottom: 32 },
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
  footer: { alignItems: "center" },
  footerText: { fontSize: 15, color: COLORS.textSecondary },
});
