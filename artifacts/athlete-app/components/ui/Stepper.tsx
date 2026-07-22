import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS, RADIUS } from "@/constants/theme";

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  style?: ViewStyle;
  decimals?: number;
  // "sm" is a compact variant for dense contexts (e.g. one per table row,
  // several per screen) — "md" (default) is the original full-size variant
  // used by the full-screen exercise wizard.
  size?: "md" | "sm";
}

const SIZES = {
  md: { btn: 52, btnFont: 22, valueFont: 32, valueMinWidth: 100, unitFont: 14 },
  sm: { btn: 36, btnFont: 18, valueFont: 20, valueMinWidth: 60, unitFont: 11 },
};

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
  label,
  style,
  decimals = 0,
  size = "md",
}: StepperProps) {
  const dim = SIZES[size];
  const decrement = () => {
    const next = Math.max(min, parseFloat((value - step).toFixed(decimals)));
    if (next !== value) {
      Haptics.selectionAsync();
      onChange(next);
    }
  };

  const increment = () => {
    const next = Math.min(max, parseFloat((value + step).toFixed(decimals)));
    if (next !== value) {
      Haptics.selectionAsync();
      onChange(next);
    }
  };

  const displayVal = decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { fontFamily: FONTS.body }]}>{label}</Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          onPress={decrement}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.btn,
            { width: dim.btn, height: dim.btn, opacity: pressed || value <= min ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { fontFamily: FONTS.bodyBold, fontSize: dim.btnFont, lineHeight: dim.btnFont + 4 }]}>−</Text>
        </Pressable>

        <View style={[styles.valueWrap, { minWidth: dim.valueMinWidth }]}>
          <Text style={[styles.value, { fontFamily: FONTS.monoBold, fontSize: dim.valueFont }]}>
            {displayVal}
          </Text>
          {unit ? (
            <Text style={[styles.unit, { fontFamily: FONTS.body, fontSize: dim.unitFont }]}>{unit}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={increment}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.btn,
            { width: dim.btn, height: dim.btn, opacity: pressed || value >= max ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { fontFamily: FONTS.bodyBold, fontSize: dim.btnFont, lineHeight: dim.btnFont + 4 }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 8 },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 22,
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  valueWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    minWidth: 100,
    justifyContent: "center",
  },
  value: {
    fontSize: 32,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  unit: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 5,
  },
});
