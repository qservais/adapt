import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const DEFAULT_PREFS = {
  session: true,
  checkin: true,
  messages: true,
  encouragements: true,
  performance: true,
  push_session: true,
  push_checkin: true,
  push_messages: true,
  push_encouragements: true,
  push_performance: true,
};

const PAGE_SIZE = 20;

router.get("/notifications", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const offset = Math.max(0, parseInt(String(req.query["offset"] ?? "0"), 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? String(PAGE_SIZE)), 10) || PAGE_SIZE));

    const [items, totalRow] = await Promise.all([
      db
        .select({
          id: notificationsTable.id,
          type: notificationsTable.type,
          title: notificationsTable.title,
          body: notificationsTable.body,
          link: notificationsTable.link,
          isRead: notificationsTable.isRead,
          createdAt: notificationsTable.createdAt,
        })
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int`, unread: sql<number>`count(*) filter (where is_read = false)::int` })
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId)),
    ]);

    const total = totalRow[0]?.count ?? 0;
    const unreadCount = totalRow[0]?.unread ?? 0;

    res.json({
      items: items.map((n) => ({
        ...n,
        createdAt: n.createdAt?.toISOString() ?? null,
      })),
      unreadCount,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/notifications/read-all", authenticate, async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, req.user!.userId), eq(notificationsTable.isRead, false)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, req.user!.userId), eq(notificationsTable.id, String(req.params["id"]))));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const prefsSchema = z.object({
  session: z.boolean().optional(),
  checkin: z.boolean().optional(),
  messages: z.boolean().optional(),
  encouragements: z.boolean().optional(),
  performance: z.boolean().optional(),
  push_session: z.boolean().optional(),
  push_checkin: z.boolean().optional(),
  push_messages: z.boolean().optional(),
  push_encouragements: z.boolean().optional(),
  push_performance: z.boolean().optional(),
});

router.get("/notifications/preferences", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const [user] = await db
      .select({ notificationPrefs: usersTable.notificationPrefs })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    const prefs = (user?.notificationPrefs as Record<string, boolean> | null) ?? DEFAULT_PREFS;
    res.json({ ...DEFAULT_PREFS, ...prefs });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/notifications/preferences", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [user] = await db
      .select({ notificationPrefs: usersTable.notificationPrefs })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    const current = (user?.notificationPrefs as Record<string, boolean> | null) ?? DEFAULT_PREFS;
    const merged = { ...DEFAULT_PREFS, ...current, ...parsed.data };
    await db
      .update(usersTable)
      .set({ notificationPrefs: merged })
      .where(eq(usersTable.id, req.user!.userId));
    res.json(merged);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
