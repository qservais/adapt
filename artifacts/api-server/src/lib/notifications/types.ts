export const NOTIFICATION_TYPES = {
  message: { prefsKey: "messages" },
  new_program: { prefsKey: "session" },
  morning_motivation: { prefsKey: "session" },
  scheduled_reminder: { prefsKey: "session" },
  new_challenge: { prefsKey: "encouragements" },
  coach_alert: { prefsKey: "performance" },
} as const satisfies Record<string, { prefsKey: string }>;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;
