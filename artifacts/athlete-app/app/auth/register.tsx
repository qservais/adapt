import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { getRegisterErrorMessage } from "@/lib/errors";
import { GradientButton } from "@/components/ui/GradientButton";
import { InputField } from "@/components/ui/InputField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useT } from "@/context/PreferencesContext";

function getPasswordStrength(
  p: string,
  labels: { weak: string; medium: string; good: string; strong: string }
): { score: number; label: string; color: string } {
  if (p.length === 0) return { score: 0, label: "", color: COLORS.border };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score: 25, label: labels.weak, color: COLORS.red };
  if (score === 2) return { score: 50, label: labels.medium, color: COLORS.amber };
  if (score === 3) return { score: 75, label: labels.good, color: COLORS.cyan };
  return { score: 100, label: labels.strong, color: COLORS.green };
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const registerMutation = useRegister();
  const t = useT();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailInUse, setEmailInUse] = useState(false);

  const strength = getPasswordStrength(password, {
    weak: t("pwd_strength_weak", "Faible"),
    medium: t("pwd_strength_medium", "Moyen"),
    good: t("pwd_strength_good", "Bon"),
    strong: t("pwd_strength_strong", "Fort"),
  });

  const handleRegister = async () => {
    setError("");
    setEmailInUse(false);
    if (!firstName.trim() || !email.trim() || !password) {
      setError(t("all_fields_required", "Tous les champs sont requis"));
      return;
    }
    if (password.length < 8) {
      setError(t("pwd_min_8", "Le mot de passe doit contenir au moins 8 caractères"));
      return;
    }
    try {
      const res = await registerMutation.mutateAsync({
        data: {
          firstName: firstName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "athlete",
        },
      });
      await login(res.accessToken, res.refreshToken, res.user);
      router.replace("/onboarding/splash");
    } catch (err: unknown) {
      setError(getRegisterErrorMessage(err));
      const status = (err as { status?: number } | null)?.status;
      const code = (err as { data?: { error?: { code?: string } } } | null)?.data?.error?.code;
      if (status === 409 || code === "EMAIL_IN_USE") {
        setEmailInUse(true);
      }
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { top: insets.top + 16 }]}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("create_account_title", "CRÉER UN COMPTE")}</Text>
          <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
            {t("join_adapt", "Rejoins ADAPT")}
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label={t("first_name", "Prénom")}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Alex"
            autoCapitalize="words"
          />
          <InputField
            label={t("email", "Email")}
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ gap: 8 }}>
            <InputField
              label={t("password", "Mot de passe")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("pwd_min_chars_placeholder", "Min. 8 caractères")}
              secureToggle
            />
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <ProgressBar
                  progress={strength.score}
                  total={100}
                  color={strength.color}
                  height={3}
                  style={{ flex: 1 }}
                />
                <Text style={[styles.strengthLabel, { color: strength.color, fontFamily: FONTS.mono }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{error}</Text>
              {emailInUse ? (
                <Pressable
                  onPress={() => router.push({ pathname: "/auth/forgot-password", params: { email: email.trim().toLowerCase() } })}
                  style={styles.errorCta}
                >
                  <Text style={[styles.errorCtaText, { fontFamily: FONTS.bodySemiBold }]}>
                    {t("forgot_password", "Mot de passe oublié ?")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <GradientButton
            label={t("create_my_account", "Créer mon compte")}
            onPress={handleRegister}
            loading={registerMutation.isPending}
          />
        </View>

        <Pressable onPress={() => router.push("/auth/login")} style={styles.loginLink}>
          <Text style={[styles.loginText, { fontFamily: FONTS.body }]}>
            {t("already_have_account", "Déjà un compte ?")}{" "}
            <Text style={{ color: COLORS.cyan, fontFamily: FONTS.bodySemiBold }}>
              {t("sign_in_link", "Se connecter")}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28 },
  backBtn: { position: "absolute", left: 20, zIndex: 10, padding: 8 },
  header: { marginTop: 64, marginBottom: 32 },
  title: { fontSize: 44, color: COLORS.white, letterSpacing: 3 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },
  form: { gap: 16, marginBottom: 32 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  strengthLabel: { fontSize: 10, letterSpacing: 1, minWidth: 35 },
  errorWrap: {
    backgroundColor: COLORS.redDim,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  errorCta: { marginTop: 10, alignItems: "center", paddingVertical: 4 },
  errorCtaText: { color: COLORS.cyan, fontSize: 14 },
  loginLink: { alignItems: "center" },
  loginText: { fontSize: 15, color: COLORS.textSecondary },
});
