import { logger } from "../lib/logger.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  pushToken: string | null | undefined,
  message: PushMessage
): Promise<void> {
  if (!pushToken) return;
  if (!pushToken.startsWith("ExponentPushToken[") && !pushToken.startsWith("ExpoPushToken[")) {
    logger.warn({ pushToken }, "Invalid Expo push token format, skipping");
    return;
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        title: message.title,
        body: message.body,
        data: message.data ?? {},
        sound: "default",
        priority: "high",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, "Expo push notification failed");
      return;
    }

    const result = (await response.json()) as { data?: { status: string; message?: string } };
    const status = result?.data?.status;
    if (status && status !== "ok") {
      logger.warn({ status, message: result?.data?.message }, "Expo push notification returned non-ok status");
    } else {
      logger.info({ pushToken: pushToken.slice(0, 30) + "…" }, "Push notification sent");
    }
  } catch (err) {
    logger.error(err, "Failed to send push notification");
  }
}

export async function sendPushNotifications(
  pushTokens: (string | null | undefined)[],
  message: PushMessage
): Promise<void> {
  const validTokens = pushTokens.filter(
    (t): t is string =>
      typeof t === "string" &&
      (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["))
  );

  if (validTokens.length === 0) return;

  try {
    const messages = validTokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: "default",
      priority: "high",
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, "Expo batch push notification failed");
      return;
    }

    logger.info({ count: validTokens.length }, "Batch push notifications sent");
  } catch (err) {
    logger.error(err, "Failed to send batch push notifications");
  }
}
