import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendPushNotification } from "./push-notification.service.js";
import { sendWebPushToUser, type StoredSubscription } from "./web-push.service.js";
import { NOTIFICATION_TYPES, type NotificationType, type NotificationTypeMeta } from "../lib/notifications/types.js";

export interface NotifyUserOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
}

export interface NotifyResult {
  inApp: boolean;
  push: boolean;
  webPush: number;
}

/**
 * Centralized notification entry point. Always inserts an in-app notification
 * (if user prefs allow) and best-effort sends an Expo push (if user prefs
 * allow and a push token is registered). A push failure never prevents the
 * in-app insert.
 */
export async function notifyUser(opts: NotifyUserOptions): Promise<NotifyResult> {
  const { userId, type, title, body, link, data } = opts;
  const meta: NotificationTypeMeta | undefined = NOTIFICATION_TYPES[type];
  if (!meta) {
    logger.warn({ type }, "notifyUser: unknown notification type");
    return { inApp: false, push: false, webPush: 0 };
  }

  const [user] = await db
    .select({
      pushToken: usersTable.pushToken,
      notificationPrefs: usersTable.notificationPrefs,
      webPushSubscriptions: usersTable.webPushSubscriptions,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    logger.warn({ userId, type }, "notifyUser: user not found");
    return { inApp: false, push: false, webPush: 0 };
  }

  const prefs = (user.notificationPrefs as Record<string, boolean> | null) ?? null;
  const baseKey = meta.prefsKey;
  const pushKey = `push_${baseKey}`;
  // Push: prefs[push_<key>] ?? prefs[<key>] ?? defaultEnabled — channel-specific opt-out wins,
  // otherwise fall back to the base toggle, finally to the type's default.
  // In-app is ALWAYS recorded (the prefs gate channel = push only), per task spec.
  const pushEnabled =
    prefs && pushKey in prefs
      ? prefs[pushKey] !== false
      : prefs && baseKey in prefs
        ? prefs[baseKey] !== false
        : meta.defaultEnabled;

  // In-app insert errors propagate by design — the in-app channel is the
  // authoritative record, so a silent drop would hide a real bug.
  await db.insert(notificationsTable).values({
    userId,
    type,
    title,
    body,
    link: link ?? meta.defaultLink ?? null,
  });
  const inAppDone = true;

  let pushDone = false;
  if (pushEnabled && user.pushToken) {
    try {
      await sendPushNotification(user.pushToken, {
        title,
        body,
        data: { link: link ?? meta.defaultLink, ...(data ?? {}) },
      });
      pushDone = true;
    } catch (err) {
      logger.error({ err, userId, type }, "notifyUser: push send failed (in-app still delivered)");
    }
  }

  // Web push (coach dashboard, etc.) — gated by the same prefs as Expo push,
  // best-effort, never blocks the in-app insert. Dead subscriptions are
  // pruned by the service.
  let webPushSent = 0;
  if (pushEnabled) {
    const subs = (user.webPushSubscriptions as StoredSubscription[] | null) ?? [];
    if (subs.length > 0) {
      try {
        const r = await sendWebPushToUser(userId, subs, {
          title,
          body,
          data: { link: link ?? meta.defaultLink, ...(data ?? {}) },
        });
        webPushSent = r.sent;
      } catch (err) {
        logger.error({ err, userId, type }, "notifyUser: web push send failed (in-app still delivered)");
      }
    }
  }

  return { inApp: inAppDone, push: pushDone, webPush: webPushSent };
}
