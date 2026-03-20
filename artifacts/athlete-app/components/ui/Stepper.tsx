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
}

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
}: StepperProps) {
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
            { opacity: pressed || value <= min ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { fontFamily: FONTS.bodyBold }]}>−</Text>
        </Pressable>

        <View style={styles.valueWrap}>
          <Text style={[styles.value, { fontFamily: FONTS.monoBold }]}>
            {displayVal}
          </Text>
          {unit ? (
            <Text style={[styles.unit, { fontFamily: FONTS.body }]}>{unit}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={increment}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.btn,
            { opacity: pressed || value >= max ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { fontFamily: FONTS.bodyBold }]}>+</Text>
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
