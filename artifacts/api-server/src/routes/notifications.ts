import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const DEFAULT_PREFS = {
  session: true,
  checkin: true,
  messages: true,
  encouragements: true,
  performance: true,
};

router.get("/notifications", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const items = await db
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
      .limit(50);

    const unreadCount = items.filter((n) => !n.isRead).length;

    res.json({
      items: items.map((n) => ({
        ...n,
        createdAt: n.createdAt?.toISOString() ?? null,
      })),
      unreadCount,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/notifications/read-all", authenticate, requireRole("athlete"), async (req, res) => {
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

router.put("/notifications/:id/read", authenticate, requireRole("athlete"), async (req, res) => {
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
