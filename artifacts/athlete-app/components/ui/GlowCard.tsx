import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/theme";

interface GlowCardProps {
  children: React.ReactNode;
  glowColor?: string;
  style?: ViewStyle;
  intensity?: "low" | "medium" | "high";
}

export function GlowCard({
  children,
  glowColor = COLORS.cyan,
  style,
  intensity = "medium",
}: GlowCardProps) {
  const shadowOpacity = intensity === "low" ? 0.15 : intensity === "high" ? 0.5 : 0.3;
  const shadowRadius = intensity === "low" ? 8 : intensity === "high" ? 24 : 14;

  return (
    <View
      style={[
        styles.card,
        {
          shadowColor: glowColor,
          shadowOpacity,
          shadowRadius,
          borderColor: `${glowColor}33`,
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
