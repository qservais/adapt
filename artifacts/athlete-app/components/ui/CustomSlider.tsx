import React, { useCallback, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, FONTS } from "@/constants/theme";

interface CustomSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  showValue?: boolean;
}

const THUMB_SIZE = 32;
const TRACK_HEIGHT = 8;

function getGradientColor(pct: number): string {
  if (pct <= 0.25) {
    return COLORS.red;
  }
  if (pct <= 0.5) {
    return COLORS.amber;
  }
  return COLORS.green;
}

export function CustomSlider({
  value,
  min = 1,
  max = 5,
  step = 1,
  onChange,
  showValue = true,
}: CustomSliderProps) {
  const [trackWidth, setTrackWidth] = useState(300);
  const trackWidthRef = useRef(trackWidth);

  const pct = (value - min) / (max - min);
  const fillColor = getGradientColor(pct);

  const getValueFromX = useCallback(
    (x: number): number => {
      const raw = (x / trackWidthRef.current) * (max - min) + min;
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onChange(getValueFromX(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        onChange(getValueFromX(e.nativeEvent.locationX));
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.trackContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackWidth(w);
          trackWidthRef.current = w;
        }}
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
              borderColor: COLORS.bg,
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
          <Text key={i} style={[styles.tickLabel, { fontFamily: FONTS.mono }]}>
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
  },
  thumbValue: {
    color: COLORS.bg,
    fontSize: 13,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 6,
  },
  tickLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
