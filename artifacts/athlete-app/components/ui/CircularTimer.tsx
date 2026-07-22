import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DEFAULT_SIZE = 200;

export interface CircularTimerRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
}

interface CircularTimerProps {
  durationSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  label?: string;
  // Compact variant for inline use (e.g. one per set row in a scrollable
  // list) — defaults to the original full-screen 200px size.
  size?: number;
  ref?: React.Ref<CircularTimerRef>;
}

export const CircularTimer = React.forwardRef<CircularTimerRef, CircularTimerProps>(
  ({ durationSeconds, onComplete, autoStart = false, label = "REPOS", size = DEFAULT_SIZE }, ref) => {
    const [seconds, setSeconds] = useState(durationSeconds);
    const [running, setRunning] = useState(autoStart);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const secondsRef = useRef(durationSeconds);

    const progress = useSharedValue(1);

    const STROKE = size <= 100 ? 5 : 8;
    const R = (size - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;

    const isRed = seconds <= 10;
    const strokeColor = isRed ? COLORS.red : COLORS.cyan;

    const animProps = useAnimatedProps(() => ({
      strokeDashoffset: CIRC * (1 - progress.value),
    }));

    const tick = () => {
      secondsRef.current -= 1;
      setSeconds(secondsRef.current);

      if ([3, 2, 1].includes(secondsRef.current)) {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning as unknown as Haptics.NotificationFeedbackType);
      }

      if (secondsRef.current <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        stop();
        onComplete?.();
      }
    };

    const start = () => {
      if (running || secondsRef.current <= 0) return;
      setRunning(true);
      progress.value = withTiming(0, {
        duration: secondsRef.current * 1000,
        easing: Easing.linear,
      });
      intervalRef.current = setInterval(tick, 1000);
    };

    const stop = () => {
      setRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const reset = () => {
      stop();
      secondsRef.current = durationSeconds;
      setSeconds(durationSeconds);
      progress.value = 1;
    };

    useImperativeHandle(ref, () => ({ start, pause: stop, reset }));

    useEffect(() => {
      if (autoStart) start();
      return stop;
    }, []);

    const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : String(s);
    };

    const compact = size <= 100;

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke={COLORS.bgElevated}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke={strokeColor}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRC}
            animatedProps={animProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.center}>
          <Text
            style={[
              styles.time,
              { fontFamily: FONTS.mono, color: isRed ? COLORS.red : COLORS.textPrimary },
              compact && { fontSize: 16, letterSpacing: 0.5 },
            ]}
          >
            {formatTime(seconds)}
          </Text>
          {!compact && (
            <Text style={[styles.label, { fontFamily: FONTS.body }]}>{label}</Text>
          )}
        </View>
      </View>
    );
  }
);

CircularTimer.displayName = "CircularTimer";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 42,
    letterSpacing: 2,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
});
