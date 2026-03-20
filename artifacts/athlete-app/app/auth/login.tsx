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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const loginMutation = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    try {
      const res = await loginMutation.mutateAsync({
        data: { email: email.trim().toLowerCase(), password },
      });
      await login(res.accessToken, res.refreshToken, res.user);
      router.replace("/(tabs)/" as any);
    } catch (e: any) {
      setError(e?.message || "Invalid credentials");
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
        <View style={styles.header}>
          <Text style={[styles.logo, { fontFamily: FONTS.title }]}>ADAPT</Text>
          <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
            by LMJ
          </Text>
          <Text style={[styles.tagline, { fontFamily: FONTS.body }]}>
            Training that adapts to you.
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureToggle
          />
          {error ? (
            <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
              {error}
            </Text>
          ) : null}
          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loginMutation.isPending}
          />
        </View>

        <Pressable
          onPress={() => router.push("/auth/register" as any)}
          style={styles.registerLink}
        >
          <Text style={[styles.registerText, { fontFamily: FONTS.body }]}>
            No account?{" "}
            <Text style={{ color: COLORS.green, fontFamily: FONTS.bodySemiBold }}>
              Create one
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
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  logo: {
    fontSize: 72,
    color: COLORS.green,
    letterSpacing: 8,
    lineHeight: 80,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    marginTop: -8,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 16,
    textAlign: "center",
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
  registerLink: {
    alignItems: "center",
  },
  registerText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
