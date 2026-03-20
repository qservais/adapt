import React from "react";
import {
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

export default function InviteScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepIndicator}>
        <Text style={[styles.step, { fontFamily: FONTS.mono }]}>04 / 05</Text>
      </View>
      <Text style={[styles.title, { fontFamily: FONTS.title }]}>COACH LINK</Text>
      <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
        Your coach will link you to their roster directly using your email address.
      </Text>

      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Feather name="link" size={40} color={COLORS.green} />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Feather name="info" size={18} color={COLORS.cyan} />
        <Text style={[styles.infoText, { fontFamily: FONTS.body }]}>
          Share your registration email with your coach. They'll add you to their roster
          and your sessions will appear automatically.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="I've told my coach"
          onPress={() => router.push("/onboarding/tutorial" as any)}
        />
        <Button
          label="Continue without coach"
          onPress={() => router.push("/onboarding/tutorial" as any)}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  stepIndicator: { marginBottom: 16 },
  step: { fontSize: 13, color: COLORS.green, letterSpacing: 2 },
  title: { fontSize: 48, color: COLORS.white, letterSpacing: 4, lineHeight: 52 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, marginBottom: 40 },
  iconWrap: { alignItems: "center", marginBottom: 40 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.cyanDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    padding: 18,
    marginBottom: 40,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actions: { gap: 12 },
});
