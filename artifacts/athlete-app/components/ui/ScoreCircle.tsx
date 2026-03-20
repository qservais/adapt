import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { COLORS, FONTS } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreCircleProps {
  score: number;
  size?: "sm" | "lg";
  color?: string;
  animated?: boolean;
  label?: string;
}

export function ScoreCircle({
  score,
  size = "lg",
  color = COLORS.cyan,
  animated = true,
  label,
}: ScoreCircleProps) {
  const dim = size === "lg" ? 200 : 120;
  const stroke = size === "lg" ? 8 : 6;
  const r = (dim - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const pct = useSharedValue(0);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - pct.value),
  }));

  useEffect(() => {
    const targetPct = Math.min(1, Math.max(0, score / 100));

    if (animated) {
      pct.value = withTiming(targetPct, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      });

      let start: number | null = null;
      const duration = 1200;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const p = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplayScore(Math.round(eased * score));
        if (p < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    } else {
      pct.value = targetPct;
      setDisplayScore(score);
    }
  }, [score, animated]);

  const fontSize = size === "lg" ? 56 : 32;
  const labelSize = size === "lg" ? 11 : 9;

  return (
    <View style={{ width: dim, height: dim, alignItems: "center", justifyContent: "center" }}>
      <Svg width={dim} height={dim}>
        <Circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          stroke={COLORS.bgElevated}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          animatedProps={animProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${dim / 2}, ${dim / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={{
              fontSize,
              color,
              fontFamily: FONTS.mono,
              letterSpacing: 1,
            }}
          >
            {displayScore}
          </Text>
          {label ? (
            <Text
              style={{
                fontSize: labelSize,
                color: color,
                fontFamily: FONTS.body,
                letterSpacing: 2,
                marginTop: 2,
                opacity: 0.8,
              }}
            >
              {label.toUpperCase()}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
