import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { GradientButton } from "@/components/ui/GradientButton";
import { BadgeToast } from "@/components/ui/BadgeToast";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function CheckinResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    score: string;
    mode: string;
    badges?: string;
    createdAt?: string;
    sleep?: string;
    energy?: string;
    stress?: string;
    soreness?: string;
    motivation?: string;
    hasPainParam?: string;
    painNotes?: string;
    cyclePhase?: string;
  }>();

  const { score, mode, badges, createdAt } = params;
  const scoreNum = parseInt(score ?? "0");
  const modeKey = (mode ?? "normal") as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;

  const canEditCheckin = createdAt
    ? Date.now() - new Date(createdAt).getTime() < TWO_HOURS_MS
    : false;

  const parsedBadges: Array<{ code: string; name: string; icon: string }> =
    badges ? JSON.parse(badges) : [];
  const [toastIndex, setToastIndex] = React.useState(0);
  const currentToast = parsedBadges[toastIndex] ?? null;

  const topOpacity = useSharedValue(0);
  const topY = useSharedValue(-20);
  const circleScale = useSharedValue(0.6);
  const circleOpacity = useSharedValue(0);
  const msgOpacity = useSharedValue(0);
  const msgY = useSharedValue(20);
  const actionsOpacity = useSharedValue(0);
  const actionsY = useSharedValue(20);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    topOpacity.value = withTiming(1, { duration: 400 });
    topY.value = withTiming(0, { duration: 400 });

    circleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    circleScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 100 }));

    msgOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    msgY.value = withDelay(600, withTiming(0, { duration: 400 }));

    actionsOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    actionsY.value = withDelay(900, withTiming(0, { duration: 400 }));
  }, []);

  const topStyle = useAnimatedStyle(() => ({
    opacity: topOpacity.value,
    transform: [{ translateY: topY.value }],
  }));
  const circleStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
    transform: [{ scale: circleScale.value }],
  }));
  const msgStyle = useAnimatedStyle(() => ({
    opacity: msgOpacity.value,
    transform: [{ translateY: msgY.value }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: actionsY.value }],
  }));

  const getMessage = () => {
    switch (modeKey) {
      case "performance":
        return "Excellente forme aujourd'hui ! Ta séance est renforcée. Vas tout donner.";
      case "adapt":
        return "Ton corps a besoin d'ajustements. La séance a été calibrée en conséquence.";
      case "recovery":
        return "Ton corps demande du repos. Aujourd'hui, c'est récupération. Respecte-le.";
      default:
        return "Bonne forme. Séance standard prête — entraîne-toi intelligemment.";
    }
  };

  const handleEditCheckin = () => {
    router.push({
      pathname: "/checkin",
      params: {
        sleep: params.sleep ?? "3",
        energy: params.energy ?? "3",
        stress: params.stress ?? "3",
        soreness: params.soreness ?? "3",
        motivation: params.motivation ?? "3",
        hasPain: params.hasPainParam ?? "0",
        painNotes: params.painNotes ?? "",
        cyclePhase: params.cyclePhase || undefined,
        edit: "1",
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <BadgeToast badge={currentToast} onDismiss={() => setToastIndex((i) => i + 1)} />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <Animated.View style={[styles.topSection, topStyle]}>
          <Text style={[styles.topLabel, { fontFamily: FONTS.mono }]}>CHECK-IN TERMINÉ</Text>
          <ModeBadge mode={modeKey} size="md" glow />
        </Animated.View>

        <Animated.View style={[styles.circleWrap, circleStyle]}>
          <ScoreCircle score={scoreNum} size="lg" color={cfg.color} />
        </Animated.View>

        <Animated.View style={[styles.messageWrap, msgStyle]}>
          <View style={[styles.messageBox, { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}0D` }]}>
            <Feather name="info" size={16} color={cfg.color} style={{ marginBottom: 4 }} />
            <Text style={[styles.message, { fontFamily: FONTS.body }]}>{getMessage()}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.actions, actionsStyle]}>
          <GradientButton
            label="Voir ma séance"
            onPress={() => router.replace("/session")}
            icon={<Feather name="zap" size={18} color={COLORS.textInverse} />}
          />
          {canEditCheckin && (
            <TouchableOpacity onPress={handleEditCheckin} style={styles.editCheckinBtn}>
              <Feather name="edit-2" size={13} color={COLORS.textMuted} />
              <Text style={[styles.editCheckinText, { fontFamily: FONTS.body }]}>
                Modifier mon check-in
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.secondaryBtn}>
            <Text style={[styles.secondaryBtnText, { fontFamily: FONTS.body }]}>
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "space-around",
  },
  topSection: { alignItems: "center", gap: 14 },
  topLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  circleWrap: { alignItems: "center" },
  messageWrap: { width: "100%" },
  messageBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: { width: "100%", gap: 12 },
  editCheckinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  editCheckinText: { fontSize: 13, color: COLORS.textMuted },
  secondaryBtn: { alignItems: "center", paddingVertical: 14 },
  secondaryBtnText: { fontSize: 15, color: COLORS.textSecondary },
});
