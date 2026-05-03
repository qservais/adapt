import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendPushNotification } from "./push-notification.service.js";
import { NOTIFICATION_TYPES, type NotificationType } from "../lib/notifications/types.js";

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
}

/**
 * Centralized notification entry point. Always inserts an in-app notification
 * (if user prefs allow) and best-effort sends an Expo push (if user prefs
 * allow and a push token is registered). A push failure never prevents the
 * in-app insert.
 */
export async function notifyUser(opts: NotifyUserOptions): Promise<NotifyResult> {
  const { userId, type, title, body, link, data } = opts;
  const meta = NOTIFICATION_TYPES[type];
  if (!meta) {
    logger.warn({ type }, "notifyUser: unknown notification type");
    return { inApp: false, push: false };
  }

  const [user] = await db
    .select({
      pushToken: usersTable.pushToken,
      notificationPrefs: usersTable.notificationPrefs,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    logger.warn({ userId, type }, "notifyUser: user not found");
    return { inApp: false, push: false };
  }

  const prefs = (user.notificationPrefs as Record<string, boolean> | null) ?? null;
  const inAppEnabled = prefs ? prefs[meta.prefsKey] !== false : true;
  const pushEnabled = prefs ? prefs[`push_${meta.prefsKey}`] !== false : true;

  let inAppDone = false;
  if (inAppEnabled) {
    try {
      await db.insert(notificationsTable).values({
        userId,
        type,
        title,
        body,
        link: link ?? null,
      });
      inAppDone = true;
    } catch (err) {
      logger.error({ err, userId, type }, "notifyUser: failed to insert in-app notification");
    }
  }

  let pushDone = false;
  if (pushEnabled && user.pushToken) {
    try {
      await sendPushNotification(user.pushToken, {
        title,
        body,
        data: { link, ...(data ?? {}) },
      });
      pushDone = true;
    } catch (err) {
      logger.error({ err, userId, type }, "notifyUser: push send failed (in-app still delivered)");
    }
  }

  return { inApp: inAppDone, push: pushDone };
}
