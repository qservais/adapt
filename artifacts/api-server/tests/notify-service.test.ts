/**
 * Integration test: notifyUser() preference handling.
 * Run: pnpm --filter @workspace/api-server exec tsx tests/notify-service.test.ts
 *
 * Creates throwaway test users with various notification_prefs configs,
 * calls notifyUser, then asserts on the rows actually written into the
 * notifications table. pushToken is left null so no real Expo HTTP call
 * is made (sendPushNotification short-circuits on falsy token).
 */

import { db, usersTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { notifyUser } from "../src/services/notify.service.js";

const TEST_EMAIL_PREFIX = "notify-test-";

async function makeUser(prefs: Record<string, boolean> | null) {
  const email = `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@test.local`;
  const [u] = await db
    .insert(usersTable)
    .values({
      email,
      role: "athlete",
      firstName: "Test",
      lastName: "User",
      notificationPrefs: prefs as unknown as object | null,
      pushToken: null,
    })
    .returning({ id: usersTable.id });
  return u.id;
}

async function countNotifs(userId: string) {
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId));
  return rows.length;
}

async function cleanup(userId: string) {
  await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log("\nnotifyUser() integration tests\n");

await test("default prefs (null) → in-app written, push attempted (no token = false)", async () => {
  const uid = await makeUser(null);
  try {
    const r = await notifyUser({ userId: uid, type: "message", title: "t", body: "b" });
    assert(r.inApp === true, "in-app should be true");
    assert(r.push === false, "push should be false (no token)");
    assert((await countNotifs(uid)) === 1, "exactly one notification row");
  } finally {
    await cleanup(uid);
  }
});

await test("prefs.messages=false → in-app skipped", async () => {
  const uid = await makeUser({ messages: false });
  try {
    const r = await notifyUser({ userId: uid, type: "message", title: "t", body: "b" });
    assert(r.inApp === false, "in-app should be skipped");
    assert(r.push === false, "push should fall back to base=false");
    assert((await countNotifs(uid)) === 0, "no notification row inserted");
  } finally {
    await cleanup(uid);
  }
});

await test("prefs.push_messages=false but messages=true → in-app written, push skipped", async () => {
  const uid = await makeUser({ messages: true, push_messages: false });
  try {
    const r = await notifyUser({ userId: uid, type: "message", title: "t", body: "b" });
    assert(r.inApp === true, "in-app should fire");
    assert(r.push === false, "push should be off");
    assert((await countNotifs(uid)) === 1, "one notification row inserted");
  } finally {
    await cleanup(uid);
  }
});

await test("coach_alert with link → notification row stores the link", async () => {
  const uid = await makeUser(null);
  try {
    await notifyUser({
      userId: uid,
      type: "coach_alert",
      title: "Alerte",
      body: "Un athlète a signalé une douleur",
      link: "/clients/abc-123",
    });
    const [row] = await db
      .select({ link: notificationsTable.link, type: notificationsTable.type })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, uid), eq(notificationsTable.type, "coach_alert")));
    assert(row?.link === "/clients/abc-123", `link should be stored, got ${row?.link}`);
  } finally {
    await cleanup(uid);
  }
});

await test("user not found → returns false/false, nothing inserted", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const r = await notifyUser({ userId: fakeId, type: "message", title: "t", body: "b" });
  assert(r.inApp === false, "no in-app");
  assert(r.push === false, "no push");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
