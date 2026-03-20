import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS } from "@/constants/theme";

interface BadgeToastProps {
  badge: { code: string; name: string; icon: string } | null;
  onDismiss: () => void;
}

export function BadgeToast({ badge, onDismiss }: BadgeToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!badge) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 120 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, [badge]);

  if (!badge) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.inner}>
        <Text style={styles.icon}>{badge.icon}</Text>
        <View style={styles.textCol}>
          <Text style={[styles.label, { fontFamily: FONTS.body }]}>Nouveau badge !</Text>
          <Text style={[styles.name, { fontFamily: FONTS.bodyBold }]}>{badge.name}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#0A1F2F",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { fontSize: 28 },
  textCol: { flex: 1, gap: 2 },
  label: { fontSize: 11, color: COLORS.cyan, letterSpacing: 1, textTransform: "uppercase" },
  name: { fontSize: 15, color: COLORS.white },
});
