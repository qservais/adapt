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

const SIZE = 200;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export interface CircularTimerRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
}

interface CircularTimerProps {
  durationSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  ref?: React.Ref<CircularTimerRef>;
}

export const CircularTimer = React.forwardRef<CircularTimerRef, CircularTimerProps>(
  ({ durationSeconds, onComplete, autoStart = false }, ref) => {
    const [seconds, setSeconds] = useState(durationSeconds);
    const [running, setRunning] = useState(autoStart);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const secondsRef = useRef(durationSeconds);

    const progress = useSharedValue(1);

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

    return (
      <View style={styles.container}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={COLORS.bgElevated}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={strokeColor}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRC}
            animatedProps={animProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={styles.center}>
          <Text
            style={[
              styles.time,
              { fontFamily: FONTS.mono, color: isRed ? COLORS.red : COLORS.textPrimary },
            ]}
          >
            {formatTime(seconds)}
          </Text>
          <Text style={[styles.label, { fontFamily: FONTS.body }]}>REPOS</Text>
        </View>
      </View>
    );
  }
);

CircularTimer.displayName = "CircularTimer";

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
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
