import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS } from "@/constants/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const bgColor =
    variant === "primary"
      ? COLORS.green
      : variant === "danger"
      ? COLORS.red
      : variant === "secondary"
      ? COLORS.bgElevated
      : "transparent";

  const textColor =
    variant === "primary"
      ? COLORS.bg
      : variant === "danger"
      ? COLORS.white
      : variant === "secondary"
      ? COLORS.white
      : COLORS.green;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgColor, opacity: pressed ? 0.8 : disabled ? 0.4 : 1 },
        variant === "ghost" && styles.ghost,
        variant === "secondary" && styles.secondary,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontFamily: FONTS.bodyBold }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  ghost: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondary: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
