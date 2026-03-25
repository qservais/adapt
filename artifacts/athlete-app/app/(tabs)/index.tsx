import React, { useCallback, useRef } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetTodayCheckin,
  useGetTodaySession,
  useGetCheckinHistory,
  useGetAthleteUpcomingSessions,
  useGetActiveChallenges,
} from "@workspace/api-client-react";
import type { CheckinData, SessionDetail, Challenge } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS, MODE_CONFIG, type SessionMode } from "@/constants/theme";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { GradientButton } from "@/components/ui/GradientButton";
import { GlowCard } from "@/components/ui/GlowCard";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { WeekCalendar } from "@/components/home/WeekCalendar";
import { ChallengeCard } from "@/components/home/ChallengeCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const { user } = useAuth();

  const checkinQuery = useGetTodayCheckin();
  const sessionQuery = useGetTodaySession();
  const historyQuery = useGetCheckinHistory();
  const upcomingQuery = useGetAthleteUpcomingSessions();
  const challengesQuery = useGetActiveChallenges();

  const todayCheckin = checkinQuery.data;
  const todaySession = sessionQuery.data;

  const isLoading = checkinQuery.isPending || sessionQuery.isPending;
  const isRefreshing = checkinQuery.isFetching || sessionQuery.isFetching;
  const onRefresh = () => {
    checkinQuery.refetch();
    sessionQuery.refetch();
    historyQuery.refetch();
    upcomingQuery.refetch();
    challengesQuery.refetch();
  };

  useFocusEffect(
    useCallback(() => {
      checkinQuery.refetch();
      sessionQuery.refetch();
      upcomingQuery.refetch();
      challengesQuery.refetch();
    }, [])
  );

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
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 84 : 88) + 24;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.cyan}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { fontFamily: FONTS.body }]}>
            Bonjour, {user?.firstName ?? "Athlète"} 👋
          </Text>
          <Text style={[styles.date, { fontFamily: FONTS.mono }]}>
            {new Date()
              .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
              .toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} activeOpacity={0.8}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={[styles.headerAvatarInitial, { fontFamily: FONTS.title }]}>
                {(user?.firstName?.[0] ?? "A").toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSkeleton />
      ) : todayCheckin == null ? (
        <StateNoPending
          onCheckin={() => router.push("/checkin")}
          upcomingSessions={upcomingQuery.data ?? []}
          activeChallenges={challengesQuery.data ?? []}
        />
      ) : (
        <StateCheckedIn
          checkin={todayCheckin}
          session={todaySession}
          modeColor={modeColor}
          upcomingSessions={upcomingQuery.data ?? []}
          activeChallenges={challengesQuery.data ?? []}
        />
      )}

      {!isLoading && (
        <StreakSection streak={streak} onBadges={() => router.push("/badges")} />
      )}
    </ScrollView>
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <SkeletonLoader width="100%" height={260} borderRadius={20} />
      <SkeletonLoader width="100%" height={120} borderRadius={20} />
    </View>
  );
}

function StateNoPending({
  onCheckin,
  upcomingSessions,
  activeChallenges,
}: {
  onCheckin: () => void;
  upcomingSessions: import("@workspace/api-client-react").UpcomingSession[];
  activeChallenges: Challenge[];
}) {
  return (
    <View style={styles.pendingContainer}>
      <View style={styles.checkinCard}>
        <View style={styles.checkinIconWrap}>
          <Feather name="sun" size={40} color={COLORS.cyan} />
        </View>
        <Text style={[styles.checkinTitle, { fontFamily: FONTS.title }]}>CHECK-IN MATINAL</Text>
        <Text style={[styles.checkinDesc, { fontFamily: FONTS.body }]}>
          Évalue ton corps aujourd'hui pour qu'ADAPT construise la séance parfaite.
        </Text>
        <GradientButton
          label="Commencer le check-in"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCheckin();
          }}
          icon={<Feather name="arrow-right" size={18} color={COLORS.textInverse} />}
        />
      </View>

      {upcomingSessions.length > 0 && (
        <View style={styles.weekCalendarCard}>
          <WeekCalendar sessions={upcomingSessions} />
        </View>
      )}

      {activeChallenges.length > 0 && (
        <ChallengeCard challenge={activeChallenges[0]!} />
      )}

      <GlowCard style={styles.lockedSession} glowColor={COLORS.border}>
        <Feather name="lock" size={20} color={COLORS.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.lockedTitle, { fontFamily: FONTS.bodyBold }]}>Séance verrouillée</Text>
          <Text style={[styles.lockedDesc, { fontFamily: FONTS.body }]}>
            Effectue ton check-in pour déverrouiller la séance du jour
          </Text>
        </View>
      </GlowCard>
    </View>
  );
}

function StateCheckedIn({
  checkin,
  session,
  modeColor,
  upcomingSessions,
  activeChallenges,
}: {
  checkin: CheckinData;
  session: SessionDetail | undefined;
  modeColor: string;
  upcomingSessions: import("@workspace/api-client-react").UpcomingSession[];
  activeChallenges: Challenge[];
}) {
  const modeKey = checkin.sessionMode as SessionMode;
  const cfg = MODE_CONFIG[modeKey] ?? MODE_CONFIG.normal;
  const isCompleted = session != null && session.completedAt != null;

  return (
    <View style={styles.checkedContainer}>
      <View style={styles.scoreSection}>
        <ScoreCircle score={checkin.adaptScore} size="lg" color={cfg.color} />
        <ModeBadge mode={modeKey} size="md" style={{ marginTop: 16 }} />
      </View>

      {upcomingSessions.length > 0 && (
        <View style={styles.weekCalendarCard}>
          <WeekCalendar sessions={upcomingSessions} />
        </View>
      )}

      {activeChallenges.length > 0 && (
        <ChallengeCard challenge={activeChallenges[0]!} />
      )}

      {isCompleted ? (
        <SessionDoneCard session={session!} modeColor={modeColor} cfg={cfg} />
      ) : session != null ? (
        <View style={[styles.sessionCard, { borderColor: `${modeColor}30` }]}>
          <View style={styles.sessionTopRow}>
            <ModeBadge mode={modeKey} size="sm" />
            <View style={styles.sessionMeta}>
              {session.sessionLocation != null && (
                <View style={[styles.locationChip, {
                  borderColor: session.sessionLocation === "presentiel" ? `${COLORS.amber}50` : `${COLORS.cyan}50`,
                  backgroundColor: session.sessionLocation === "presentiel" ? `${COLORS.amber}15` : COLORS.cyanDim,
                }]}>
                  <Feather
                    name={session.sessionLocation === "presentiel" ? "map-pin" : "video"}
                    size={9}
                    color={session.sessionLocation === "presentiel" ? COLORS.amber : COLORS.cyan}
                  />
                  <Text style={[styles.locationText, {
                    fontFamily: FONTS.mono,
                    color: session.sessionLocation === "presentiel" ? COLORS.amber : COLORS.cyan,
                  }]}>
                    {session.sessionLocation === "presentiel" ? "PRÉSENTIEL" : "EN LIGNE"}
                  </Text>
                </View>
              )}
              {session.estimatedDurationMin != null && (
                <Text style={[styles.sessionDuration, { fontFamily: FONTS.mono }]}>
                  {session.estimatedDurationMin} MIN
                </Text>
              )}
              <View style={styles.exCountChip}>
                <Text style={[styles.exCountText, { fontFamily: FONTS.mono }]}>
                  {session.exercises?.length ?? 0} EX.
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.sessionName, { fontFamily: FONTS.title, color: modeColor }]}>
            {session.name}
          </Text>
          {session.coachNotes != null && (
            <View style={styles.coachNoteRow}>
              <Feather name="message-square" size={13} color={COLORS.cyan} />
              <Text style={[styles.coachNote, { fontFamily: FONTS.body }]}>
                {session.coachNotes}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/session");
            }}
            style={[styles.startBtn, { backgroundColor: modeColor }]}
          >
            <Feather name="play" size={18} color={COLORS.bg} />
            <Text style={[styles.startBtnText, { fontFamily: FONTS.bodyBold }]}>DÉMARRER</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noSessionCard}>
          <Feather name="calendar" size={28} color={COLORS.textMuted} />
          <Text style={[styles.noSessionText, { fontFamily: FONTS.body }]}>
            Aucune séance prévue aujourd'hui
          </Text>
        </View>
      )}
    </View>
  );
}

function SessionDoneCard({
  session,
  modeColor,
  cfg,
}: {
  session: SessionDetail;
  modeColor: string;
  cfg: { color: string; label: string };
}) {
  const durationMin = session.durationMin ?? session.estimatedDurationMin;
  const exCount = session.exercises?.length ?? 0;

  return (
    <View style={[styles.doneCard, { borderColor: `${modeColor}30` }]}>
      <View style={styles.doneIconRow}>
        <View style={[styles.doneIconWrap, { backgroundColor: `${modeColor}20`, borderColor: `${modeColor}40` }]}>
          <Feather name="check-circle" size={36} color={modeColor} />
        </View>
      </View>
      <Text style={[styles.doneTitleSmall, { fontFamily: FONTS.mono, color: modeColor }]}>
        SÉANCE TERMINÉE
      </Text>
      <Text style={[styles.doneTitle, { fontFamily: FONTS.title, color: COLORS.white }]}>
        BIEN JOUÉ !
      </Text>
      <Text style={[styles.doneName, { fontFamily: FONTS.body, color: COLORS.textSecondary }]}>
        {session.name}
      </Text>
      <View style={styles.doneStatsRow}>
        {durationMin != null && (
          <View style={styles.doneStat}>
            <Text style={[styles.doneStatVal, { fontFamily: FONTS.monoBold, color: modeColor }]}>
              {durationMin}
            </Text>
            <Text style={[styles.doneStatLabel, { fontFamily: FONTS.body }]}>min</Text>
          </View>
        )}
        {exCount > 0 && (
          <View style={styles.doneStat}>
            <Text style={[styles.doneStatVal, { fontFamily: FONTS.monoBold, color: modeColor }]}>
              {exCount}
            </Text>
            <Text style={[styles.doneStatLabel, { fontFamily: FONTS.body }]}>exercices</Text>
          </View>
        )}
        <View style={styles.doneStat}>
          <Text style={[styles.doneStatVal, { fontFamily: FONTS.monoBold, color: modeColor }]}>
            +1
          </Text>
          <Text style={[styles.doneStatLabel, { fontFamily: FONTS.body }]}>streak</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/session")}
        style={[styles.doneHistBtn, { borderColor: `${modeColor}40` }]}
        activeOpacity={0.7}
      >
        <Feather name="bar-chart-2" size={15} color={modeColor} />
        <Text style={[styles.doneHistBtnText, { fontFamily: FONTS.bodyMedium, color: modeColor }]}>
          Voir l'historique
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function StreakSection({ streak, onBadges }: { streak: number; onBadges: () => void }) {
  return (
    <View style={styles.streakSection}>
      <TouchableOpacity style={styles.streakCard} onPress={onBadges} activeOpacity={0.8}>
        <View style={styles.streakLeft}>
          <Feather name="zap" size={18} color={COLORS.amber} />
          <View>
            <Text style={[styles.streakValue, { fontFamily: FONTS.monoBold }]}>
              {streak > 0 ? streak : "0"}
            </Text>
            <Text style={[styles.streakLabel, { fontFamily: FONTS.body }]}>
              jour{streak !== 1 ? "s" : ""} d'affilée
            </Text>
          </View>
        </View>
        <View style={styles.badgesLink}>
          <Text style={[styles.badgesText, { fontFamily: FONTS.bodyMedium }]}>Mes badges</Text>
          <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
  },
  headerAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarInitial: { fontSize: 18, color: COLORS.cyan },
  greeting: { fontSize: 17, color: COLORS.textSecondary },
  date: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, marginTop: 3 },
  pendingContainer: { gap: 16 },
  checkinCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}30`,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  checkinIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.cyanDim,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${COLORS.cyan}50`,
  },
  checkinTitle: { fontSize: 32, color: COLORS.white, letterSpacing: 3, textAlign: "center" },
  checkinDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  lockedSession: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  lockedTitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 2 },
  lockedDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  checkedContainer: { gap: 16 },
  weekCalendarCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  scoreSection: { alignItems: "center", paddingVertical: 8 },
  sessionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  sessionTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionDuration: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5, fontFamily: FONTS.mono },
  exCountChip: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exCountText: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  locationText: { fontSize: 9, letterSpacing: 0.5 },
  sessionName: { fontSize: 32, letterSpacing: 2, lineHeight: 36 },
  coachNoteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  coachNote: { flex: 1, fontSize: 13, color: COLORS.textMuted, fontStyle: "italic", lineHeight: 18 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  startBtnText: { fontSize: 15, color: COLORS.bg, letterSpacing: 1.5 },
  noSessionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: 12,
    padding: 36,
  },
  noSessionText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center" },
  doneCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    gap: 10,
    alignItems: "center",
  },
  doneIconRow: { marginBottom: 4 },
  doneIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  doneTitleSmall: { fontSize: 11, letterSpacing: 3, marginTop: 4 },
  doneTitle: { fontSize: 42, color: COLORS.white, letterSpacing: 4 },
  doneName: { fontSize: 14, textAlign: "center", marginTop: -4 },
  doneStatsRow: {
    flexDirection: "row",
    gap: 32,
    marginTop: 12,
    marginBottom: 4,
  },
  doneStat: { alignItems: "center", gap: 2 },
  doneStatVal: { fontSize: 28 },
  doneStatLabel: { fontSize: 12, color: COLORS.textMuted },
  doneHistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  doneHistBtnText: { fontSize: 14 },
  streakSection: {
    marginTop: 28,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  streakValue: {
    fontSize: 22,
    color: COLORS.amber,
  },
  streakLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  badgesLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgesText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
