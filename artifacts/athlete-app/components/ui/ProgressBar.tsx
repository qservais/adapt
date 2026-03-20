import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { COLORS } from "@/constants/theme";

interface ProgressBarProps {
  progress: number;
  total: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  total,
  color = COLORS.cyan,
  height = 3,
  style,
  animated = true,
}: ProgressBarProps) {
  const pct = total > 0 ? Math.min(1, Math.max(0, progress / total)) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      width.value = withSpring(pct, { damping: 20, stiffness: 120 });
    } else {
      width.value = pct;
    }
  }, [pct, animated]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height }, style]}>
      <Animated.View
        style={[
          styles.fill,
          animStyle,
          {
            height,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: COLORS.bgElevated,
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 99,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
});
