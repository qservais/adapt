import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import type { UpcomingSession } from "@workspace/api-client-react";

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getWeekDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

interface WeekCalendarProps {
  sessions: UpcomingSession[];
  onSessionPress?: (session: UpcomingSession) => void;
}

export function WeekCalendar({ sessions, onSessionPress }: WeekCalendarProps) {
  const weekDays = getWeekDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionsByDate = React.useMemo(() => {
    const map = new Map<string, UpcomingSession[]>();
    for (const s of sessions) {
      const key = s.scheduledDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>CETTE SEMAINE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {weekDays.map((day) => {
          const dateStr = day.toISOString().split("T")[0]!;
          const daySessions = sessionsByDate.get(dateStr) ?? [];
          const isToday = day.getTime() === today.getTime();
          const isPast = day.getTime() < today.getTime();
          const dayIdx = (day.getDay() + 6) % 7;
          const label = JOURS_COURTS[dayIdx] ?? "";

          return (
            <View key={dateStr} style={styles.dayCol}>
              <Text style={[
                styles.dayLabel,
                { fontFamily: FONTS.mono, color: isToday ? COLORS.cyan : COLORS.textMuted }
              ]}>
                {label}
              </Text>
              <View style={[
                styles.dayNum,
                isToday && styles.dayNumToday
              ]}>
                <Text style={[
                  styles.dayNumText,
                  { fontFamily: FONTS.monoBold, color: isToday ? COLORS.bg : (isPast ? COLORS.textMuted : COLORS.textSecondary) }
                ]}>
                  {day.getDate()}
                </Text>
              </View>

              <View style={styles.dotsCol}>
                {daySessions.length === 0 ? (
                  <View style={styles.emptyDot} />
                ) : (
                  daySessions.map((session) => (
                    <SessionDot
                      key={session.sessionId}
                      session={session}
                      isPast={isPast}
                      onPress={onSessionPress ? () => onSessionPress(session) : undefined}
                    />
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SessionDot({
  session,
  isPast,
  onPress,
}: {
  session: UpcomingSession;
  isPast: boolean;
  onPress?: () => void;
}) {
  const isOnline = session.sessionLocation !== "presentiel";
  const dotColor = session.isCompleted
    ? COLORS.green
    : isPast
    ? COLORS.textMuted
    : isOnline
    ? COLORS.cyan
    : COLORS.violet;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.sessionDot, { backgroundColor: `${dotColor}20`, borderColor: dotColor }]}
    >
      {session.isCompleted ? (
        <Feather name="check" size={8} color={COLORS.green} />
      ) : (
        <Feather
          name={isOnline ? "video" : "map-pin"}
          size={8}
          color={dotColor}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  scroll: {
    gap: 8,
    paddingRight: 4,
  },
  dayCol: {
    alignItems: "center",
    gap: 6,
    width: 38,
  },
  dayLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumToday: {
    backgroundColor: COLORS.cyan,
  },
  dayNumText: {
    fontSize: 12,
  },
  dotsCol: {
    gap: 3,
    alignItems: "center",
  },
  emptyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.bgElevated,
  },
  sessionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
