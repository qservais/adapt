import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { COLORS, RADIUS } from "@/constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
  glowColor?: string;
  padding?: number;
  intensity?: "low" | "medium" | "high";
}

export function Card({
  children,
  style,
  glow = false,
  glowColor = COLORS.cyan,
  padding = 20,
  intensity = "medium",
}: CardProps) {
  const glowOpacity = intensity === "high" ? 0.5 : intensity === "medium" ? 0.3 : 0.15;
  const glowRadius = intensity === "high" ? 20 : intensity === "medium" ? 14 : 8;

  return (
    <View
      style={[
        styles.card,
        { padding },
        glow && {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glowOpacity,
          shadowRadius: glowRadius,
          elevation: 8,
          borderColor: `${glowColor}40`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
