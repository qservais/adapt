import React from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetTodayCheckin,
  useGetTodaySession,
  useGetCheckinHistory,
} from "@workspace/api-client-react";
import type { CheckinData, SessionDetail } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { AdaptScoreDisplay } from "@/components/ui/AdaptScoreDisplay";
import { GlowCard } from "@/components/ui/GlowCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const checkinQuery = useGetTodayCheckin();
  const sessionQuery = useGetTodaySession();
  const historyQuery = useGetCheckinHistory();

  const todayCheckin = checkinQuery.data;
  const todaySession = sessionQuery.data;

  const isRefreshing = checkinQuery.isFetching || sessionQuery.isFetching;
  const onRefresh = () => {
    checkinQuery.refetch();
    sessionQuery.refetch();
    historyQuery.refetch();
  };

  const modeColor =
    todayCheckin != null
      ? (MODE_CONFIG[todayCheckin.sessionMode as SessionMode]?.color ?? COLORS.green)
      : COLORS.green;

  const streak = React.useMemo(() => {
    const history = historyQuery.data;
    if (!history?.length) return 0;
    const sorted = [...history].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let count = 0;
    const expected = new Date();
    expected.setHours(0, 0, 0, 0);
    let expectedMs = expected.getTime();
    for (const c of sorted) {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      const diff = (expectedMs - d.getTime()) / 86400000;
      if (diff <= 1) {
        count++;
        expectedMs = d.getTime() - 86400000;
      } else {
        break;
      }
    }
    return count;
  }, [historyQuery.data]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: tabBarHeight + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.green}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { fontFamily: FONTS.body }]}>
            Bonjour, {user?.firstName ?? "Athlete"}
          </Text>
          <Text style={[styles.date, { fontFamily: FONTS.mono }]}>
            {new Date()
              .toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              .toUpperCase()}
          </Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Feather name="zap" size={14} color={COLORS.amber} />
            <Text style={[styles.streakText, { fontFamily: FONTS.monoBold }]}>
              {streak}
            </Text>
          </View>
        )}
      </View>

      {todayCheckin == null ? (
        <StateNoPending onCheckin={() => router.push("/checkin")} />
      ) : (
        <StateCheckedIn
          checkin={todayCheckin}
          session={todaySession}
          modeColor={modeColor}
        />
      )}
    </ScrollView>
  );
}

function StateNoPending({ onCheckin }: { onCheckin: () => void }) {
  return (
    <View style={styles.pendingContainer}>
      <GlowCard glowColor={COLORS.green} intensity="high" style={styles.checkinCard}>
        <View style={styles.checkinCardContent}>
          <View style={styles.pulseIcon}>
            <Feather name="sun" size={36} color={COLORS.green} />
          </View>
          <Text style={[styles.checkinTitle, { fontFamily: FONTS.title }]}>
            MORNING CHECK-IN
          </Text>
          <Text style={[styles.checkinDesc, { fontFamily: FONTS.body }]}>
            Rate your body today so ADAPT can build the perfect session for you.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onCheckin();
            }}
            style={({ pressed }) => [
              styles.checkinBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.checkinBtnText, { fontFamily: FONTS.bodyBold }]}>
              Start Check-in
            </Text>
            <Feather name="arrow-right" size={20} color={COLORS.bg} />
          </Pressable>
        </View>
      </GlowCard>

      <GlowCard style={styles.lockedSession} glowColor={COLORS.border}>
        <View style={styles.lockedContent}>
          <Feather name="lock" size={22} color={COLORS.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.lockedTitle, { fontFamily: FONTS.bodyBold }]}>
              Session Locked
            </Text>
            <Text style={[styles.lockedDesc, { fontFamily: FONTS.body }]}>
              Complete your check-in to unlock today's session
            </Text>
          </View>
        </View>
      </GlowCard>
    </View>
  );
}

function StateCheckedIn({
  checkin,
  session,
  modeColor,
}: {
  checkin: CheckinData;
  session: SessionDetail | undefined;
  modeColor: string;
}) {
  const modeKey = checkin.sessionMode as SessionMode;
  return (
    <View style={styles.checkedContainer}>
      <View style={styles.scoreSection}>
        <AdaptScoreDisplay score={checkin.adaptScore} mode={modeKey} size="lg" />
      </View>

      {session != null ? (
        <GlowCard glowColor={modeColor} intensity="medium" style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <ModeBadge mode={modeKey} size="sm" />
            <Text style={[styles.sessionDuration, { fontFamily: FONTS.mono }]}>
              {session.estimatedDurationMin != null ? `${session.estimatedDurationMin} MIN` : ""}
            </Text>
          </View>
          <Text style={[styles.sessionName, { fontFamily: FONTS.title }]}>
            {session.name}
          </Text>
          <Text style={[styles.sessionExCount, { fontFamily: FONTS.body }]}>
            {session.exercises?.length ?? 0} exercices
          </Text>
          {session.coachNotes != null && (
            <Text style={[styles.coachNote, { fontFamily: FONTS.body }]}>
              "{session.coachNotes}"
            </Text>
          )}
          <TouchableOpacity
            onPress={() => router.push("/session")}
            style={[styles.startBtn, { backgroundColor: modeColor }]}
          >
            <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold, color: COLORS.bg }]}>
              DÉMARRER
            </Text>
            <Feather name="arrow-right" size={18} color={COLORS.bg} />
          </TouchableOpacity>
        </GlowCard>
      ) : (
        <GlowCard style={styles.noSessionCard} glowColor={COLORS.border}>
          <Feather name="calendar" size={28} color={COLORS.textMuted} />
          <Text style={[styles.noSessionText, { fontFamily: FONTS.body }]}>
            No session planned for today
          </Text>
        </GlowCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.amberDim,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.amber,
  },
  streakText: {
    color: COLORS.amber,
    fontSize: 14,
  },
  pendingContainer: { gap: 16 },
  checkinCard: { padding: 0, overflow: "hidden" },
  checkinCardContent: {
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  pulseIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.greenDim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  checkinTitle: {
    fontSize: 34,
    color: COLORS.white,
    letterSpacing: 3,
    textAlign: "center",
  },
  checkinDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  checkinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginTop: 4,
  },
  checkinBtnText: {
    fontSize: 16,
    color: COLORS.bg,
  },
  lockedSession: {
    padding: 20,
  },
  lockedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  lockedTitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  lockedDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  checkedContainer: { gap: 24 },
  scoreSection: { alignItems: "center", paddingVertical: 12 },
  sessionCard: { gap: 12 },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionDuration: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 1 },
  sessionName: { fontSize: 34, color: COLORS.white, letterSpacing: 2, lineHeight: 38 },
  sessionExCount: { fontSize: 14, color: COLORS.textSecondary },
  coachNote: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    lineHeight: 19,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 4,
  },
  startBtnText: { fontSize: 15, letterSpacing: 1.5 },
  noSessionCard: {
    alignItems: "center",
    gap: 12,
    padding: 32,
  },
  noSessionText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center" },
});
