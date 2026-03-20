import React, { useCallback } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  PanResponder,
} from "react-native";
import { COLORS, FONTS } from "@/constants/theme";

interface CustomSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  showValue?: boolean;
}

const THUMB_SIZE = 32;
const TRACK_HEIGHT = 8;

export function CustomSlider({
  value,
  min = 1,
  max = 5,
  step = 1,
  onChange,
  label,
  showValue = true,
}: CustomSliderProps) {
  const [trackWidth, setTrackWidth] = React.useState(300);

  const pct = (value - min) / (max - min);

  const getValueFromX = useCallback(
    (x: number) => {
      const raw = (x / trackWidth) * (max - min) + min;
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [trackWidth, min, max, step]
  );

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        onChange(getValueFromX(x));
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        onChange(getValueFromX(x));
      },
    })
  ).current;

  const fillColor = pct <= 0.3 ? COLORS.red : pct <= 0.6 ? COLORS.amber : COLORS.green;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={styles.trackContainer}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct * 100}%`,
                backgroundColor: fillColor,
                shadowColor: fillColor,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: pct * (trackWidth - THUMB_SIZE),
              backgroundColor: fillColor,
              shadowColor: fillColor,
            },
          ]}
        >
          {showValue && (
            <Text style={[styles.thumbValue, { fontFamily: FONTS.monoBold }]}>
              {value}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.ticks}>
        {Array.from({ length: max - min + 1 }).map((_, i) => (
          <Text key={i} style={styles.tickLabel}>
            {min + i}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  trackContainer: {
    height: THUMB_SIZE + 16,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.bgElevated,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fill: {
    height: "100%",
    borderRadius: TRACK_HEIGHT / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  thumbValue: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: "700",
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  tickLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
