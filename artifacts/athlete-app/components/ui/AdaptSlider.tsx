import React, { useCallback, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS } from "@/constants/theme";

interface AdaptSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  activeColor?: string;
  labels?: string[];
  style?: ViewStyle;
  showTicks?: boolean;
}

const THUMB = 36;
const TRACK_H = 6;

export function AdaptSlider({
  value,
  min = 1,
  max = 10,
  step = 1,
  onChange,
  activeColor = COLORS.cyan,
  labels,
  style,
  showTicks = true,
}: AdaptSliderProps) {
  const [trackW, setTrackW] = useState(280);
  const trackRef = useRef(trackW);
  const lastVal = useRef(value);

  // Update synchronously on every render so PanResponder always has the latest callback
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pct = (value - min) / (max - min);

  const getVal = useCallback(
    (x: number) => {
      const raw = (x / trackRef.current) * (max - min) + min;
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const v = getVal(e.nativeEvent.locationX);
        if (v !== lastVal.current) {
          Haptics.selectionAsync();
          lastVal.current = v;
          onChangeRef.current(v);
        }
      },
      onPanResponderMove: (e) => {
        const v = getVal(e.nativeEvent.locationX);
        if (v !== lastVal.current) {
          Haptics.selectionAsync();
          lastVal.current = v;
          onChangeRef.current(v);
        }
      },
    })
  ).current;

  const tickCount = Math.floor((max - min) / step) + 1;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={styles.trackContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackW(w);
          trackRef.current = w;
        }}
        {...pan.panHandlers}
      >
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct * 100}%`,
                backgroundColor: activeColor,
                shadowColor: activeColor,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: Math.max(0, pct * (trackW - THUMB)),
              backgroundColor: activeColor,
              shadowColor: activeColor,
              borderColor: COLORS.bg,
            },
          ]}
        >
          <Text style={[styles.thumbVal, { fontFamily: FONTS.monoBold }]}>
            {value}
          </Text>
        </View>
      </View>

      {showTicks && (
        <View style={styles.ticks}>
          {Array.from({ length: tickCount }).map((_, i) => {
            const v = min + i * step;
            return (
              <Text
                key={v}
                style={[
                  styles.tick,
                  { fontFamily: FONTS.mono },
                  v === value && { color: activeColor },
                ]}
              >
                {labels?.[i] ?? String(v)}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", paddingHorizontal: 4 },
  trackContainer: {
    height: THUMB + 16,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: TRACK_H,
    backgroundColor: COLORS.bgElevated,
    borderRadius: TRACK_H / 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fill: {
    height: "100%",
    borderRadius: TRACK_H / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
  },
  thumbVal: {
    color: COLORS.bg,
    fontSize: 12,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  tick: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
