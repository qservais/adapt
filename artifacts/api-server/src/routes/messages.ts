import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { z } from "zod";
import { sendPushNotification } from "../services/push-notification.service.js";

const router = Router();
const storage = new ObjectStorageService();

router.get("/messages", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const allMessages = await db.select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      content: messagesTable.content,
      mediaType: messagesTable.mediaType,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
    })
      .from(messagesTable)
      .where(or(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, userId)))
      .orderBy(desc(messagesTable.createdAt));

    const threadMap = new Map<string, {
      userId: string;
      lastMessage: string;
      lastMediaType: string | null;
      lastMessageAt: Date | null;
      unreadCount: number;
    }>();

    for (const msg of allMessages) {
      const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!threadMap.has(otherId)) {
        threadMap.set(otherId, {
          userId: otherId,
          lastMessage: msg.content,
          lastMediaType: msg.mediaType ?? null,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }
      if (msg.recipientId === userId && !msg.isRead) {
        threadMap.get(otherId)!.unreadCount += 1;
      }
    }

    const threads = [];
    for (const [otherId, thread] of threadMap.entries()) {
      const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, avatarUrl: usersTable.avatarUrl })
        .from(usersTable).where(eq(usersTable.id, otherId));
      threads.push({
        userId: otherId,
        userFirstName: user?.firstName ?? "Unknown",
        userLastName: user?.lastName ?? null,
        userAvatarUrl: user?.avatarUrl ?? null,
        lastMessage: thread.lastMessage,
        lastMediaType: thread.lastMediaType,
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
    const otherId = String(req.params["userId"]);

    const messages = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.senderId, myId), eq(messagesTable.recipientId, otherId)),
        and(eq(messagesTable.senderId, otherId), eq(messagesTable.recipientId, myId))
      ))
      .orderBy(messagesTable.createdAt);

    const result = await Promise.all(messages.map(async (msg) => {
      let resolvedMediaUrl = msg.mediaUrl ?? null;
      if (resolvedMediaUrl && resolvedMediaUrl.startsWith("/objects/")) {
        try {
          resolvedMediaUrl = await storage.getObjectEntitySignedDownloadUrl(resolvedMediaUrl, 3600);
        } catch {
          resolvedMediaUrl = null;
        }
      }
      return {
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        content: msg.content,
        mediaType: msg.mediaType ?? null,
        mediaUrl: resolvedMediaUrl,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const sendSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(0).max(4000).default(""),
  mediaType: z.enum(["audio", "video"]).optional(),
  mediaUrl: z.string().optional(),
});

router.post("/messages", authenticate, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  const { recipientId, content, mediaType, mediaUrl } = parsed.data;
  if (!content && !mediaUrl) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Contenu ou média requis" } });
    return;
  }

  try {
    let storedMediaUrl: string | null = null;
    if (mediaUrl) {
      storedMediaUrl = storage.normalizeObjectEntityPath(mediaUrl);
    }

    const [message] = await db.insert(messagesTable).values({
      senderId: req.user!.userId,
      recipientId,
      content: content || (mediaType === "audio" ? "🎤 Message vocal" : "🎬 Vidéo"),
      mediaType: mediaType ?? null,
      mediaUrl: storedMediaUrl,
    }).returning();

    const [sender] = await db
      .select({ firstName: usersTable.firstName, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));

    const [recipient] = await db
      .select({ pushToken: usersTable.pushToken, notificationPrefs: usersTable.notificationPrefs, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, recipientId));

    if (recipient && sender) {
      const prefs = (recipient.notificationPrefs as Record<string, boolean> | null);
      const inAppEnabled = prefs ? prefs["messages"] !== false : true;
      const pushEnabled = prefs ? prefs["push_messages"] !== false : true;

      const notifTitle = `Message de ${sender.firstName}`;
      const notifBody = mediaType === "audio" ? "🎤 Message vocal" : mediaType === "video" ? "🎬 Vidéo" : content.slice(0, 100);
      const notifLink = `/messages/${req.user!.userId}`;

      if (inAppEnabled) {
        await db.insert(notificationsTable).values({
          userId: recipientId,
          type: "message",
          title: notifTitle,
          body: notifBody,
          link: notifLink,
        });
      }

      if (pushEnabled && recipient.pushToken) {
        await sendPushNotification(recipient.pushToken, {
          title: notifTitle,
          body: notifBody,
          data: { link: notifLink },
        });
      }
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/messages/:userId/read", authenticate, async (req, res) => {
  try {
    const otherId = String(req.params["userId"]);
    await db.update(messagesTable).set({ isRead: true })
      .where(and(
        eq(messagesTable.senderId, otherId),
        eq(messagesTable.recipientId, req.user!.userId)
      ));
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/messages/upload-audio", authenticate, async (req, res) => {
  try {
    const uploadUrl = await storage.getObjectEntityUploadURL();
    res.json({ uploadUrl });
  } catch (err) {
    res.status(500).json({ error: "Impossible de générer l'URL d'upload audio" });
  }
});

router.post("/messages/upload-video", authenticate, async (req, res) => {
  try {
    const uploadUrl = await storage.getObjectEntityUploadURL();
    res.json({ uploadUrl });
  } catch (err) {
    res.status(500).json({ error: "Impossible de générer l'URL d'upload vidéo" });
  }
});

router.post("/messages/upload-media", authenticate, async (req, res) => {
  try {
    const uploadUrl = await storage.getObjectEntityUploadURL();
    res.json({ uploadUrl });
  } catch (err) {
    res.status(500).json({ error: "Impossible de générer l'URL d'upload" });
  }
});

export default router;
