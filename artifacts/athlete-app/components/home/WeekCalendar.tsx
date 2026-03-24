import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import type { UpcomingSession } from "@workspace/api-client-react";

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const SESSION_TYPE_FR: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hybrid: "Hybride",
  mobility: "Mobilité",
  athletic_development: "Athlétisme",
  running: "Course",
  conditioning: "Conditioning",
};

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

interface WeekCalendarProps {
  sessions: UpcomingSession[];
}

export function WeekCalendar({ sessions }: WeekCalendarProps) {
  const weekDays = getWeekDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [sheetDate, setSheetDate] = useState<string | null>(null);

  const sessionsByDate = React.useMemo(() => {
    const map = new Map<string, UpcomingSession[]>();
    for (const s of sessions) {
      const key = s.scheduledDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  const sheetSessions = sheetDate ? (sessionsByDate.get(sheetDate) ?? []) : [];

  const sheetDayLabel = React.useMemo(() => {
    if (!sheetDate) return "";
    const d = new Date(sheetDate + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  }, [sheetDate]);

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
          const hasSessions = daySessions.length > 0;

          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.dayCol}
              onPress={() => hasSessions ? setSheetDate(dateStr) : null}
              activeOpacity={hasSessions ? 0.7 : 1}
            >
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
                    <SessionDot key={session.sessionId} session={session} isPast={isPast} />
                  ))
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal
        visible={sheetDate !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetDate(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSheetDate(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { fontFamily: FONTS.bodyBold }]}>
              {sheetDayLabel.charAt(0).toUpperCase() + sheetDayLabel.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setSheetDate(null)}>
              <Feather name="x" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {sheetSessions.map((session) => {
              const isOnline = session.sessionLocation !== "presentiel";
              const locationColor = isOnline ? COLORS.cyan : COLORS.amber;
              const trainingType = SESSION_TYPE_FR[session.sessionType] ?? session.sessionType;
              return (
                <View key={session.sessionId} style={styles.sheetSessionItem}>
                  <View style={[styles.sheetSessionDot, {
                    backgroundColor: session.isCompleted ? `${COLORS.green}20` : `${locationColor}20`,
                    borderColor: session.isCompleted ? COLORS.green : locationColor,
                  }]}>
                    {session.isCompleted ? (
                      <Feather name="check" size={12} color={COLORS.green} />
                    ) : (
                      <Feather name={isOnline ? "video" : "map-pin"} size={12} color={locationColor} />
                    )}
                  </View>
                  <View style={styles.sheetSessionInfo}>
                    <Text style={[styles.sheetSessionName, { fontFamily: FONTS.bodyBold }]}>
                      {session.sessionName}
                    </Text>
                    <View style={styles.sheetSessionMeta}>
                      {trainingType ? (
                        <Text style={[styles.sheetMetaText, { fontFamily: FONTS.mono }]}>
                          {trainingType}
                        </Text>
                      ) : null}
                      <View style={[styles.sheetLocationBadge, {
                        borderColor: `${locationColor}40`,
                        backgroundColor: `${locationColor}12`,
                      }]}>
                        <Text style={[styles.sheetLocationText, { fontFamily: FONTS.mono, color: locationColor }]}>
                          {isOnline ? "En ligne" : "Présentiel"}
                        </Text>
                      </View>
                      {session.estimatedDurationMin != null && (
                        <Text style={[styles.sheetMetaText, { fontFamily: FONTS.mono }]}>
                          {session.estimatedDurationMin} min
                        </Text>
                      )}
                    </View>
                  </View>
                  {session.isCompleted && (
                    <Feather name="check-circle" size={16} color={COLORS.green} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SessionDot({
  session,
  isPast,
}: {
  session: UpcomingSession;
  isPast: boolean;
}) {
  const isOnline = session.sessionLocation !== "presentiel";
  const dotColor = session.isCompleted
    ? COLORS.green
    : isPast
    ? COLORS.textMuted
    : isOnline
    ? COLORS.cyan
    : COLORS.amber;

  return (
    <View style={[styles.sessionDot, { backgroundColor: `${dotColor}20`, borderColor: dotColor }]}>
      {session.isCompleted ? (
        <Feather name="check" size={8} color={COLORS.green} />
      ) : (
        <Feather name={isOnline ? "video" : "map-pin"} size={8} color={dotColor} />
      )}
    </View>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "60%",
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    color: COLORS.white,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetSessionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetSessionDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sheetSessionInfo: {
    flex: 1,
    gap: 5,
  },
  sheetSessionName: {
    fontSize: 14,
    color: COLORS.white,
  },
  sheetSessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sheetMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  sheetLocationBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  sheetLocationText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
