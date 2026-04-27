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

function getPasswordStrength(p: string): { score: number; label: string; color: string } {
  if (p.length === 0) return { score: 0, label: "", color: COLORS.border };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score: 25, label: "Faible", color: COLORS.red };
  if (score === 2) return { score: 50, label: "Moyen", color: COLORS.amber };
  if (score === 3) return { score: 75, label: "Bon", color: COLORS.cyan };
  return { score: 100, label: "Fort", color: COLORS.green };
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);

  const handleRegister = async () => {
    setError("");
    if (!firstName.trim() || !email.trim() || !password) {
      setError("Tous les champs sont requis");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
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
          <Text style={[styles.title, { fontFamily: FONTS.title }]}>CRÉER UN COMPTE</Text>
          <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
            Rejoins ADAPT
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Alex"
            autoCapitalize="words"
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ gap: 8 }}>
            <InputField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 caractères"
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
            </View>
          ) : null}

          <GradientButton
            label="Créer mon compte"
            onPress={handleRegister}
            loading={registerMutation.isPending}
          />
        </View>

        <Pressable onPress={() => router.push("/auth/login")} style={styles.loginLink}>
          <Text style={[styles.loginText, { fontFamily: FONTS.body }]}>
            Déjà un compte ?{" "}
            <Text style={{ color: COLORS.cyan, fontFamily: FONTS.bodySemiBold }}>
              Se connecter
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
  loginLink: { alignItems: "center" },
  loginText: { fontSize: 15, color: COLORS.textSecondary },
});
