import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS, RADIUS } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
  style?: ViewStyle;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  secureToggle,
  style,
  prefix,
  suffix,
  secureTextEntry,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const borderColor = error
    ? COLORS.red
    : focused
    ? COLORS.cyan
    : COLORS.border;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text style={[styles.label, { fontFamily: FONTS.bodyMedium }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          { borderColor },
          focused && styles.focused,
          error ? styles.errorBorder : null,
        ]}
      >
        {prefix ? <View style={styles.prefix}>{prefix}</View> : null}
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? !visible : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, { fontFamily: FONTS.body }]}
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.cyan}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setVisible(!visible)}
            style={styles.suffix}
          >
            <Feather
              name={visible ? "eye-off" : "eye"}
              size={18}
              color={COLORS.textMuted}
            />
          </Pressable>
        ) : suffix ? (
          <View style={styles.suffix}>{suffix}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { fontFamily: FONTS.body }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { fontFamily: FONTS.body }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  focused: {
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  errorBorder: {
    borderColor: COLORS.red,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  prefix: { marginRight: 8 },
  suffix: { marginLeft: 8 },
  error: { fontSize: 12, color: COLORS.red },
  hint: { fontSize: 12, color: COLORS.textMuted },
});
