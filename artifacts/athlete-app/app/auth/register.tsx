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
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
      const msg = err instanceof Error ? err.message : "Échec de l'inscription";
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
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { top: insets.top + 16 }]}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: FONTS.title }]}>
            CRÉER UN COMPTE
          </Text>
          <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
            Rejoins ADAPT by LMJ
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
          <InputField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 caractères"
            secureToggle
          />
          {error ? (
            <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
              {error}
            </Text>
          ) : null}
          <Button
            label="Créer mon compte"
            onPress={handleRegister}
            loading={registerMutation.isPending}
          />
        </View>

        <Pressable
          onPress={() => router.push("/auth/login")}
          style={styles.loginLink}
        >
          <Text style={[styles.loginText, { fontFamily: FONTS.body }]}>
            Déjà un compte ?{" "}
            <Text style={{ color: COLORS.green, fontFamily: FONTS.bodySemiBold }}>
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
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    gap: 0,
  },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    marginTop: 60,
    marginBottom: 32,
  },
  title: {
    fontSize: 44,
    color: COLORS.white,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    textAlign: "center",
  },
  loginLink: {
    alignItems: "center",
  },
  loginText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
