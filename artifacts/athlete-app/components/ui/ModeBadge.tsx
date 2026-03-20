import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";

interface ModeBadgeProps {
  mode: string;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  style?: ViewStyle;
}

export function ModeBadge({ mode, size = "md", glow = false, style }: ModeBadgeProps) {
  const cfg = MODE_CONFIG[mode as SessionMode] ?? MODE_CONFIG.normal;

  const fontSize = size === "sm" ? 9 : size === "lg" ? 14 : 11;
  const paddingH = size === "sm" ? 8 : size === "lg" ? 16 : 10;
  const paddingV = size === "sm" ? 3 : size === "lg" ? 6 : 4;
  const borderR = size === "sm" ? 4 : 6;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.dim,
          borderColor: `${cfg.color}60`,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius: borderR,
        },
        glow && {
          shadowColor: cfg.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 6,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: cfg.color, fontSize, fontFamily: FONTS.mono },
        ]}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
