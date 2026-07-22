import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { formatRecordValue } from "@/lib/formatRecord";

const { width } = Dimensions.get("window");

export interface PRToastData {
  exerciseName: string;
  recordType: string;
  value: number;
}

interface PRToastProps {
  pr: PRToastData | null;
  formatWeight: (kg: number | null | undefined) => string;
  onDismiss: () => void;
}

// Trophy-moment toast fired the instant a logged set beats the athlete's
// existing PR (Part 2) — styled after BadgeToast.tsx's slide-down pattern,
// paired with the same "NOUVEAU RECORD !" wording and green accent already
// used for PR pulses (exercise.tsx) and the post-session PR list
// (complete.tsx), plus a small confetti burst reusing the same cannon.
export function PRToast({ pr, formatWeight, onDismiss }: PRToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (!pr) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => confettiRef.current?.start(), 80);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 120 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3200);

    return () => clearTimeout(timer);
  }, [pr]);

  if (!pr) return null;

  return (
    <>
      <ConfettiCannon
        ref={confettiRef}
        count={60}
        origin={{ x: width / 2, y: 0 }}
        autoStart={false}
        colors={[COLORS.green, COLORS.cyan, COLORS.gold]}
        fadeOut
        explosionSpeed={300}
        fallSpeed={2600}
      />
      <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <Feather name="award" size={22} color={COLORS.green} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.label, { fontFamily: FONTS.body }]}>NOUVEAU RECORD !</Text>
            <Text style={[styles.name, { fontFamily: FONTS.bodyBold }]} numberOfLines={1}>
              {pr.exerciseName} · {formatRecordValue(pr.recordType, pr.value, formatWeight)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </>
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
    backgroundColor: "#0F1F14",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.green}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, gap: 2 },
  label: { fontSize: 11, color: COLORS.green, letterSpacing: 1.5, textTransform: "uppercase" },
  name: { fontSize: 15, color: COLORS.white },
});
