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
  const [role, setRole] = useState<"athlete" | "coach">("athlete");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!firstName.trim() || !email.trim() || !password) {
      setError("All fields required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    try {
      const res = await registerMutation.mutateAsync({
        data: {
          firstName: firstName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        },
      });
      await login(res.accessToken, res.refreshToken, res.user);
      if (role === "athlete") {
        router.replace("/onboarding/profile");
      } else {
        router.replace("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
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
            CREATE ACCOUNT
          </Text>
          <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
            Join ADAPT by LMJ
          </Text>
        </View>

        <View style={styles.roleRow}>
          {(["athlete", "coach"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={[
                styles.roleBtn,
                role === r && styles.roleActive,
              ]}
            >
              <Feather
                name={r === "athlete" ? "activity" : "users"}
                size={20}
                color={role === r ? COLORS.green : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.roleLabel,
                  { fontFamily: FONTS.bodyMedium },
                  role === r && { color: COLORS.green },
                ]}
              >
                {r === "athlete" ? "Athlete" : "Coach"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <InputField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Alex"
            autoCapitalize="words"
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            secureToggle
          />
          {error ? (
            <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>
              {error}
            </Text>
          ) : null}
          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={registerMutation.isPending}
          />
        </View>

        <Pressable
          onPress={() => router.push("/auth/login")}
          style={styles.loginLink}
        >
          <Text style={[styles.loginText, { fontFamily: FONTS.body }]}>
            Already have an account?{" "}
            <Text style={{ color: COLORS.green, fontFamily: FONTS.bodySemiBold }}>
              Sign in
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
    fontSize: 48,
    color: COLORS.white,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenDim,
  },
  roleLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
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
