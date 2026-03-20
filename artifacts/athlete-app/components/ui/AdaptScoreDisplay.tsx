import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ModeBadge } from "./ModeBadge";

interface AdaptScoreDisplayProps {
  score: number;
  mode: string;
  size?: "sm" | "lg";
}

export function AdaptScoreDisplay({ score, mode, size = "lg" }: AdaptScoreDisplayProps) {
  const cfg = MODE_CONFIG[mode as SessionMode] ?? MODE_CONFIG.normal;
  const animScore = useSharedValue(0);

  useEffect(() => {
    animScore.value = withSpring(score, { damping: 20, stiffness: 80 });
  }, [score]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.6 + animScore.value / 200,
  }));

  const isLarge = size === "lg";

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.scoreCircle,
          isLarge ? styles.scoreLarge : styles.scoreSmall,
          {
            borderColor: cfg.color,
            shadowColor: cfg.color,
            backgroundColor: cfg.dim,
          },
          glowStyle,
        ]}
      >
        <Text
          style={[
            styles.scoreText,
            isLarge ? styles.scoreTextLarge : styles.scoreTextSmall,
            { color: cfg.color, fontFamily: FONTS.mono },
          ]}
        >
          {score}
        </Text>
        {isLarge && (
          <Text style={[styles.scoreLabel, { color: cfg.color, fontFamily: FONTS.body }]}>
            ADAPT SCORE
          </Text>
        )}
      </Animated.View>
      <View style={{ marginTop: 12 }}>
        <ModeBadge mode={mode} size={isLarge ? "lg" : "md"} glow />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  scoreCircle: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 10,
  },
  scoreLarge: {
    width: 180,
    height: 180,
  },
  scoreSmall: {
    width: 80,
    height: 80,
  },
  scoreText: {
    lineHeight: undefined,
  },
  scoreTextLarge: {
    fontSize: 64,
  },
  scoreTextSmall: {
    fontSize: 28,
  },
  scoreLabel: {
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },
});
