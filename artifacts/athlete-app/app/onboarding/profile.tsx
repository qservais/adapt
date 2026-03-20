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
import { useUpdateMe } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/InputField";

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateMe();
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [error, setError] = useState("");

  const handleNext = async () => {
    setError("");
    const ageN = parseInt(age);
    const weightN = parseFloat(weight);
    const heightN = parseInt(height);
    if (!age || !weight || !height) {
      setError("Please fill in all fields");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        data: {
          age: ageN || undefined,
          weightKg: weightN || undefined,
          heightCm: heightN || undefined,
        },
      });
      router.push("/onboarding/fitness" as any);
    } catch {
      router.push("/onboarding/fitness" as any);
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
          <Text style={[styles.step, { fontFamily: FONTS.mono }]}>01 / 05</Text>
        </View>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>YOUR PROFILE</Text>
        <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
          We'll use this to tailor your experience.
        </Text>

        <View style={styles.form}>
          <InputField
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="25"
            keyboardType="number-pad"
          />
          <InputField
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="70"
            keyboardType="decimal-pad"
          />
          <InputField
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            placeholder="175"
            keyboardType="number-pad"
          />
          {error ? (
            <Text style={[styles.error, { fontFamily: FONTS.body }]}>{error}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button label="Continue" onPress={handleNext} loading={updateMutation.isPending} />
          <Button
            label="Skip for now"
            onPress={() => router.push("/onboarding/fitness" as any)}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28 },
  stepIndicator: { marginBottom: 16 },
  step: { fontSize: 13, color: COLORS.green, letterSpacing: 2 },
  title: { fontSize: 48, color: COLORS.white, letterSpacing: 4, lineHeight: 52 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, marginBottom: 40 },
  form: { gap: 16, marginBottom: 32 },
  error: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  actions: { gap: 12 },
});
