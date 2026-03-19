import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/messages", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const allMessages = await db.select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      content: messagesTable.content,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
    })
      .from(messagesTable)
      .where(or(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, userId)))
      .orderBy(desc(messagesTable.createdAt));

    // Group into threads
    const threadMap = new Map<string, any>();
    for (const msg of allMessages) {
      const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!threadMap.has(otherId)) {
        threadMap.set(otherId, {
          userId: otherId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }
      if (msg.recipientId === userId && !msg.isRead) {
        threadMap.get(otherId).unreadCount += 1;
      }
    }

    // Fetch user info for each thread
    const threads = [];
    for (const [otherId, thread] of threadMap.entries()) {
      const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(eq(usersTable.id, otherId));
      threads.push({
        userId: otherId,
        userFirstName: user?.firstName || "Unknown",
        userLastName: user?.lastName ?? null,
        lastMessage: thread.lastMessage,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        unreadCount: thread.unreadCount,
      });
    }

    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/messages/:userId", authenticate, async (req, res) => {
  try {
    const myId = req.user!.userId;
    const otherId = req.params.userId;

    const messages = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.senderId, myId), eq(messagesTable.recipientId, otherId)),
        and(eq(messagesTable.senderId, otherId), eq(messagesTable.recipientId, myId))
      ))
      .orderBy(messagesTable.createdAt);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const sendSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1),
});

router.post("/messages", authenticate, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const [message] = await db.insert(messagesTable).values({
      senderId: req.user!.userId,
      recipientId: parsed.data.recipientId,
      content: parsed.data.content,
    }).returning();

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/messages/:userId/read", authenticate, async (req, res) => {
  try {
    await db.update(messagesTable).set({ isRead: true })
      .where(and(
        eq(messagesTable.senderId, req.params.userId),
        eq(messagesTable.recipientId, req.user!.userId)
      ));
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
