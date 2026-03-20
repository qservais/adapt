import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function InputField({
  label,
  error,
  secureToggle,
  secureTextEntry,
  style,
  ...props
}: InputFieldProps) {
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          focused && { borderColor: COLORS.cyan },
          error && { borderColor: COLORS.red },
        ]}
      >
        <TextInput
          style={[styles.input, style, { fontFamily: FONTS.body }]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureToggle ? !showPass : secureTextEntry}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setShowPass((v) => !v)}
            style={styles.eyeBtn}
          >
            <Feather
              name={showPass ? "eye" : "eye-off"}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  error: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.red,
    marginTop: 2,
  },
});
