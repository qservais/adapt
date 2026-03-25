import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS, FONTS } from "@/constants/theme";
import type { Challenge } from "@workspace/api-client-react";

const METRIC_FR: Record<string, string> = {
  reps: "répétitions",
  distance: "km",
  time: "minutes",
  sessions: "séances",
};

function daysRemaining(endDate: string) {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return diff;
}

function progressPercent(progress: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(1, progress / target);
}

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const pct = progressPercent(challenge.progress, challenge.target);
  const days = daysRemaining(challenge.endDate);
  const isCompleted = challenge.completedAt != null;
  const unit = challenge.unit ?? METRIC_FR[challenge.metric] ?? challenge.metric;
  const accentColor = isCompleted ? COLORS.green : COLORS.amber;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: `${accentColor}30` }]}
      onPress={() => router.push(`/challenges/${challenge.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
          {isCompleted ? (
            <Feather name="check-circle" size={16} color={accentColor} />
          ) : (
            <Feather name="zap" size={16} color={accentColor} />
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.label, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
            {isCompleted ? "CHALLENGE COMPLÉTÉ" : "CHALLENGE EN COURS"}
          </Text>
          {!isCompleted && days > 0 && (
            <Text style={[styles.daysLeft, { fontFamily: FONTS.mono, color: accentColor }]}>
              {days} JOUR{days > 1 ? "S" : ""} RESTANT{days > 1 ? "S" : ""}
            </Text>
          )}
        </View>
        <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
      </View>

      <Text style={[styles.title, { fontFamily: FONTS.bodyBold, color: COLORS.white }]} numberOfLines={2}>
        {challenge.title}
      </Text>

      {challenge.description != null && (
        <Text style={[styles.description, { fontFamily: FONTS.body }]} numberOfLines={2}>
          {challenge.description}
        </Text>
      )}

      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressValue, { fontFamily: FONTS.monoBold, color: accentColor }]}>
            {challenge.progress} / {challenge.target} {unit}
          </Text>
          <Text style={[styles.progressPct, { fontFamily: FONTS.mono, color: COLORS.textMuted }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  daysLeft: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  progressSection: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressValue: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  progressPct: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bgElevated,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
