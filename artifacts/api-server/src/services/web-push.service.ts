import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt?: string;
}

export interface WebPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:contact@adapt-system.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("web-push: VAPID keys missing — web push disabled");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}

/**
 * Sends a web push to every subscription belonging to the user. Subscriptions
 * that come back as 404 / 410 (gone) are removed from the user's record so
 * we don't keep retrying them.
 */
export async function sendWebPushToUser(
  userId: string,
  subscriptions: StoredSubscription[],
  payload: WebPushPayload
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };
  if (!subscriptions || subscriptions.length === 0) return { sent: 0, removed: 0 };

  const json = JSON.stringify(payload);
  const deadEndpoints: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub as WebPushSubscription, json, { TTL: 60 });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number } | undefined)?.statusCode;
        if (status === 404 || status === 410) {
          deadEndpoints.push(sub.endpoint);
        } else {
          logger.warn({ err, status, userId, endpoint: sub.endpoint }, "web-push: send failed");
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    const remaining = subscriptions.filter((s) => !deadEndpoints.includes(s.endpoint));
    try {
      await db.update(usersTable).set({ webPushSubscriptions: remaining }).where(eq(usersTable.id, userId));
      logger.info({ userId, removed: deadEndpoints.length }, "web-push: pruned dead subscriptions");
    } catch (err) {
      logger.error({ err, userId }, "web-push: failed to prune dead subscriptions");
    }
  }

  return { sent, removed: deadEndpoints.length };
}
