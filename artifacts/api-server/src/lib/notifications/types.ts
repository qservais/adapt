export interface NotificationTypeMeta {
  prefsKey: string;
  defaultEnabled: boolean;
  defaultLink?: string;
}

export const NOTIFICATION_TYPES = {
  message:            { prefsKey: "messages",       defaultEnabled: true },
  new_program:        { prefsKey: "session",        defaultEnabled: true, defaultLink: "/(tabs)/session" },
  morning_motivation: { prefsKey: "session",        defaultEnabled: true, defaultLink: "/(tabs)/session" },
  scheduled_reminder: { prefsKey: "session",        defaultEnabled: true, defaultLink: "/(tabs)/session" },
  new_challenge:      { prefsKey: "encouragements", defaultEnabled: true, defaultLink: "/(tabs)/challenges" },
  coach_alert:        { prefsKey: "performance",    defaultEnabled: true },
  gift_credits:       { prefsKey: "session",        defaultEnabled: true },
  booking_confirmed:  { prefsKey: "session",        defaultEnabled: true },
  class_cancelled:    { prefsKey: "session",        defaultEnabled: true },
  waitlist_spot_freed:{ prefsKey: "session",        defaultEnabled: true },
  one_on_one_request: { prefsKey: "session",        defaultEnabled: true },
  one_on_one_confirmed:{ prefsKey: "session",       defaultEnabled: true },
} as const satisfies Record<string, NotificationTypeMeta>;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;
