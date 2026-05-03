import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, badgesTable, userBadgesTable, personalRecordsTable, prHistoryTable, exercisesTable, sessionLogsTable, checkinsTable, exerciseLogsTable, programsTable, sessionsTable, userIntegrationsTable } from "@workspace/db";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import { objectStorageClient } from "../lib/objectStorage.js";
import { encryptToken } from "../lib/tokenEncryption.js";
import { t } from "../locales/index.js";
import {
  GetPersonalRecordsResponse,
  GetExercisePRHistoryParams,
  GetExercisePRHistoryResponse,
} from "@workspace/api-zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont acceptées"));
    }
  },
});

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;

const router = Router();

function resolveAvatarUrl(user: { id: string; avatarUrl: string | null }): string | null {
  if (!user.avatarUrl) return null;
  if (user.avatarUrl.startsWith("http")) return user.avatarUrl;
  return `/api/users/avatar/${user.id}`;
}

function userProfile(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    birthDate: user.birthDate,
    age: user.age,
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    trainingFrequency: user.trainingFrequency,
    injuries: user.injuries,
    fitnessLevel: user.fitnessLevel,
    primaryGoal: user.primaryGoal,
    cycleTracking: user.cycleTracking,
    lastPeriodDate: user.lastPeriodDate,
    avgCycleDays: user.avgCycleDays,
    coachId: user.coachId,
    inviteCode: user.inviteCode,
    avatarUrl: resolveAvatarUrl(user),
  };
}

router.get("/users/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: t(req.locale, "errors.userNotFound") } });
      return;
    }
    let coachName: string | null = null;
    if (user.coachId) {
      const [coach] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(eq(usersTable.id, user.coachId));
      if (coach) {
        coachName = `${coach.firstName} ${coach.lastName ?? ""}`.trim();
      }
    }
    res.json({ ...userProfile(user), coachName });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  gender: z.enum(["homme", "femme", "autre"]).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  age: z.number().int().min(10).max(120).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  heightCm: z.number().int().min(50).max(300).optional(),
  trainingFrequency: z.number().int().min(1).max(14).optional(),
  injuries: z.string().optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  primaryGoal: z.enum(["strength", "muscle", "fat_loss", "performance", "health", "aesthetic", "fitness"]).optional(),
  cycleTracking: z.boolean().optional(),
  lastPeriodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  avgCycleDays: z.number().int().min(20).max(45).nullable().optional(),
});

router.put("/users/me", authenticate, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const data = parsed.data;
    const [user] = await db.update(usersTable)
      .set({
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.weightKg !== undefined && { weightKg: data.weightKg.toString() }),
        ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
        ...(data.trainingFrequency !== undefined && { trainingFrequency: data.trainingFrequency }),
        ...(data.injuries !== undefined && { injuries: data.injuries }),
        ...(data.fitnessLevel !== undefined && { fitnessLevel: data.fitnessLevel }),
        ...(data.primaryGoal !== undefined && { primaryGoal: data.primaryGoal }),
        ...(data.cycleTracking !== undefined && { cycleTracking: data.cycleTracking }),
        ...(data.lastPeriodDate !== undefined && { lastPeriodDate: data.lastPeriodDate }),
        ...(data.avgCycleDays !== undefined && { avgCycleDays: data.avgCycleDays }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json(userProfile(user));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

const pushTokenSchema = z.object({
  token: z.string().min(1),
});

// ───── Web Push (browser notifications, mainly coach dashboard) ───────────
// Allowlist of well-known push service hosts. Restricting to these prevents
// authenticated users from registering arbitrary endpoints that the server
// would later POST to (SSRF mitigation).
const WEB_PUSH_ALLOWED_HOSTS = [
  /\.googleapis\.com$/i,           // FCM (Chrome, Edge, Brave, Opera)
  /\.push\.services\.mozilla\.com$/i, // Mozilla autopush (Firefox)
  /^push\.services\.mozilla\.com$/i,
  /\.notify\.windows\.com$/i,      // WNS (Edge legacy)
  /\.push\.apple\.com$/i,          // Apple (Safari 16+)
  /\.web\.push\.apple\.com$/i,
];

function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return WEB_PUSH_ALLOWED_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

const webPushSubscribeSchema = z.object({
  endpoint: z.string().url().refine(isAllowedPushEndpoint, {
    message: "Endpoint not allowed (must be an https URL on a known push service host)",
  }),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

router.get("/users/web-push/public-key", async (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? null;
  if (!key) {
    res.status(503).json({ error: { code: "WEB_PUSH_UNCONFIGURED", message: t(req.locale, "errors.webPushNotConfigured") } });
    return;
  }
  res.json({ publicKey: key });
});

router.post("/users/web-push/subscribe", authenticate, async (req, res) => {
  const parsed = webPushSubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [user] = await db
      .select({ subs: usersTable.webPushSubscriptions })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    const existing = (user?.subs as Array<{ endpoint: string; keys: { p256dh: string; auth: string }; createdAt?: string }> | null) ?? [];
    const filtered = existing.filter((s) => s.endpoint !== parsed.data.endpoint);
    const next = [
      ...filtered,
      { endpoint: parsed.data.endpoint, keys: parsed.data.keys, createdAt: new Date().toISOString() },
    ];
    await db
      .update(usersTable)
      .set({ webPushSubscriptions: next, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId));
    res.json({ success: true, count: next.length });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

const webPushUnsubscribeSchema = z.object({ endpoint: z.string().url() });

router.delete("/users/web-push/subscribe", authenticate, async (req, res) => {
  const parsed = webPushUnsubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [user] = await db
      .select({ subs: usersTable.webPushSubscriptions })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    const existing = (user?.subs as Array<{ endpoint: string; keys: { p256dh: string; auth: string }; createdAt?: string }> | null) ?? [];
    const next = existing.filter((s) => s.endpoint !== parsed.data.endpoint);
    await db
      .update(usersTable)
      .set({ webPushSubscriptions: next, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId));
    res.json({ success: true, count: next.length });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.post("/users/push-token", authenticate, async (req, res) => {
  const parsed = pushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    await db
      .update(usersTable)
      .set({ pushToken: parsed.data.token, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.get("/users/avatar/:userId", async (req, res) => {
  const userId = String(req.params["userId"]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: t(req.locale, "errors.noAvatar") } });
    return;
  }
  try {
    const [user] = await db.select({ avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, userId));

    if (!user?.avatarUrl) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: t(req.locale, "errors.noAvatar") } });
      return;
    }

    const objectName = user.avatarUrl;
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const storageFile = bucket.file(objectName);
    const [exists] = await storageFile.exists();
    if (!exists) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: t(req.locale, "errors.avatarNotFound") } });
      return;
    }

    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "public, max-age=60");
    const stream = storageFile.createReadStream();
    stream.on("error", (streamErr) => {
      console.error("Avatar stream error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.avatarLoadError") } });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error("Avatar serve error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.post("/users/me/avatar", authenticate, (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: { code: "FILE_TOO_LARGE", message: t(req.locale, "errors.imageTooLarge5Mb") } });
      return;
    }
    if (err) {
      res.status(400).json({ error: { code: "UPLOAD_ERROR", message: err.message } });
      return;
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: { code: "NO_FILE", message: t(req.locale, "errors.noFileProvided") } });
    return;
  }
  try {
    const resized = await sharp(req.file.buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const timestamp = Date.now();
    const objectName = `avatars/${req.user!.userId}-${timestamp}.jpg`;
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const storageFile = bucket.file(objectName);
    await storageFile.save(resized, { contentType: "image/jpeg", resumable: false });

    // Lookup previous avatar to delete it after the DB update succeeds
    const [prev] = await db.select({ avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId));
    const previousAvatar = prev?.avatarUrl ?? null;

    const [updatedUser] = await db.update(usersTable)
      .set({ avatarUrl: objectName, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    // Best-effort cleanup of the previous avatar object — never block the response
    if (previousAvatar && previousAvatar !== objectName) {
      bucket.file(previousAvatar).delete({ ignoreNotFound: true }).catch((delErr) => {
        console.warn("Failed to delete old avatar:", previousAvatar, delErr?.message);
      });
    }

    res.json({ avatarUrl: `/api/users/avatar/${req.user!.userId}?t=${timestamp}`, user: userProfile(updatedUser) });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.photoUploadError") } });
  }
});

router.delete("/users/me/coach", authenticate, async (req, res) => {
  try {
    const [user] = await db.select({ id: usersTable.id, coachId: usersTable.coachId })
      .from(usersTable).where(eq(usersTable.id, req.user!.userId));

    if (!user || !user.coachId) {
      res.status(400).json({ error: { code: "NO_COACH", message: t(req.locale, "errors.noCoachLinked") } });
      return;
    }

    await db.update(usersTable)
      .set({ coachId: null, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId));

    res.json({ success: true, message: "Coach délié avec succès" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.get("/users/badges", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const allBadges = await db.select().from(badgesTable).orderBy(badgesTable.sortOrder);
    const unlocked = await db.select({ badgeId: userBadgesTable.badgeId, unlockedAt: userBadgesTable.unlockedAt })
      .from(userBadgesTable)
      .where(eq(userBadgesTable.userId, userId));

    const unlockedMap: Record<string, string> = {};
    for (const ub of unlocked) {
      unlockedMap[ub.badgeId] = ub.unlockedAt ? ub.unlockedAt.toISOString() : "";
    }

    const badges = allBadges.map(b => ({
      code: b.code,
      name: b.name,
      description: b.description,
      icon: b.icon,
      category: b.category,
      sortOrder: b.sortOrder,
      unlocked: !!unlockedMap[b.id],
      unlockedAt: unlockedMap[b.id] ?? null,
    }));

    res.json({ badges, total: badges.length, unlockedCount: unlocked.length });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.get("/users/prs", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const prs = await db.select({
      exerciseId: personalRecordsTable.exerciseId,
      exerciseName: exercisesTable.name,
      loadKg: personalRecordsTable.loadKg,
      reps: personalRecordsTable.reps,
      previousLoadKg: personalRecordsTable.previousLoadKg,
      achievedAt: personalRecordsTable.achievedAt,
    })
      .from(personalRecordsTable)
      .innerJoin(exercisesTable, eq(personalRecordsTable.exerciseId, exercisesTable.id))
      .where(eq(personalRecordsTable.userId, userId))
      .orderBy(desc(personalRecordsTable.achievedAt));

    const payload = GetPersonalRecordsResponse.parse({
      personalRecords: prs.map(pr => ({
        exerciseId: pr.exerciseId,
        exerciseName: pr.exerciseName,
        loadKg: parseFloat(pr.loadKg),
        reps: pr.reps,
        previousLoadKg: pr.previousLoadKg ? parseFloat(pr.previousLoadKg) : null,
        achievedAt: pr.achievedAt?.toISOString(),
        isRecent: pr.achievedAt ? pr.achievedAt > sevenDaysAgo : false,
      })),
      total: prs.length,
    });

    res.json(payload);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.get("/users/prs/:exerciseId/history", authenticate, async (req, res) => {
  const paramsResult = GetExercisePRHistoryParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: paramsResult.error.message } });
    return;
  }

  try {
    const userId = req.user!.userId;
    const { exerciseId } = paramsResult.data;

    const [exercise] = await db.select({ name: exercisesTable.name })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId));

    if (!exercise) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: t(req.locale, "errors.exerciseNotFound") } });
      return;
    }

    const history = await db.select({
      id: prHistoryTable.id,
      loadKg: prHistoryTable.loadKg,
      reps: prHistoryTable.reps,
      achievedAt: prHistoryTable.achievedAt,
    })
      .from(prHistoryTable)
      .where(and(
        eq(prHistoryTable.userId, userId),
        eq(prHistoryTable.exerciseId, exerciseId)
      ))
      .orderBy(prHistoryTable.achievedAt);

    const payload = GetExercisePRHistoryResponse.parse({
      exerciseId,
      exerciseName: exercise.name,
      history: history.map(h => ({
        id: h.id,
        loadKg: parseFloat(h.loadKg),
        reps: h.reps,
        achievedAt: h.achievedAt.toISOString(),
      })),
    });

    res.json(payload);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

function completionPercent(user: typeof usersTable.$inferSelect): number {
  let score = 0;
  const checks: [boolean, number][] = [
    [!!user.firstName, 5],
    [!!user.birthDate, 5],
    [!!user.gender, 5],
    [!!user.weightKg, 5],
    [!!user.heightCm, 5],
    [!!user.fitnessLevel, 10],
    [!!user.primaryGoal, 10],
    [!!user.avatarUrl, 10],
    [!!((user.availableDays as string[] | null)?.length), 15],
    [!!((user.trainingLocations as string[] | null)?.length), 10],
    [!!((user.equipment as string[] | null)?.length), 10],
    [!!user.sessionDurationMin, 5],
    [!!user.secondaryGoal, 5],
  ];
  for (const [cond, weight] of checks) {
    if (cond) score += weight;
  }
  return Math.min(100, score);
}

function extendedProfile(user: typeof usersTable.$inferSelect) {
  return {
    ...userProfile(user),
    secondaryGoal: user.secondaryGoal ?? null,
    sessionDurationMin: user.sessionDurationMin ?? null,
    sessionDurationMax: user.sessionDurationMax ?? null,
    availableDays: (user.availableDays as string[] | null) ?? [],
    trainingLocations: (user.trainingLocations as string[] | null) ?? [],
    equipment: (user.equipment as string[] | null) ?? [],
    avoidedExercises: (user.avoidedExercises as string[] | null) ?? [],
    favoriteExercises: (user.favoriteExercises as string[] | null) ?? [],
    language: user.language ?? "fr",
    theme: user.theme ?? "dark",
    units: user.units ?? "metric",
    privacySettings: (user.privacySettings as { shareWeight?: boolean; shareSleep?: boolean; shareHeartRate?: boolean; shareBodyFat?: boolean } | null) ?? {},
    morningNotifHour: user.morningNotifHour ?? 7,
    notificationPrefs: (user.notificationPrefs as Record<string, boolean> | null) ?? {},
    completionPercent: completionPercent(user),
  };
}

const VALID_DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;
const VALID_LOCATIONS = ["gym", "home", "outdoor"] as const;
const VALID_EQUIPMENT = ["barbell", "dumbbell", "kettlebell", "machine", "cable", "bodyweight", "bands", "trx"] as const;

const extendedProfileSchema = z.object({
  primaryGoal: z.enum(["strength", "muscle", "fat_loss", "performance", "health", "aesthetic", "fitness"]).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  injuries: z.string().max(2000).optional(),
  secondaryGoal: z.string().max(200).nullable().optional(),
  sessionDurationMin: z.number().int().min(15).max(240).nullable().optional(),
  sessionDurationMax: z.number().int().min(15).max(240).nullable().optional(),
  availableDays: z.array(z.enum(VALID_DAYS)).max(7).nullable().optional(),
  trainingLocations: z.array(z.enum(VALID_LOCATIONS)).max(3).nullable().optional(),
  equipment: z.array(z.enum(VALID_EQUIPMENT)).max(8).nullable().optional(),
  avoidedExercises: z.array(z.string().max(100)).max(50).nullable().optional(),
  favoriteExercises: z.array(z.string().max(100)).max(50).nullable().optional(),
  language: z.enum(["fr", "en"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  privacySettings: z.object({
    shareWeight: z.boolean().optional(),
    shareSleep: z.boolean().optional(),
    shareHeartRate: z.boolean().optional(),
    shareBodyFat: z.boolean().optional(),
    shareContext: z.boolean().optional(),
    profileVisibility: z.enum(["coach_only", "private"]).optional(),
  }).strict().optional(),
  morningNotifHour: z.number().int().min(5).max(23).optional(),
  notificationPrefs: z.record(z.boolean()).optional(),
}).strict().refine(
  (d) => {
    if (d.sessionDurationMin != null && d.sessionDurationMax != null) {
      return d.sessionDurationMin <= d.sessionDurationMax;
    }
    return true;
  },
  { message: "sessionDurationMin doit être inférieur ou égal à sessionDurationMax", path: ["sessionDurationMin"] },
);

const INTEGRATION_PROVIDERS = ["apple_health", "garmin", "strava", "whoop", "fitbit"] as const;

router.get("/users/me/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: t(req.locale, "errors.userNotFound") } });
      return;
    }

    const existingIntegrations = await db.select({
      provider: userIntegrationsTable.provider,
      isConnected: userIntegrationsTable.isConnected,
      connectedAt: userIntegrationsTable.connectedAt,
      lastSyncAt: userIntegrationsTable.lastSyncAt,
    }).from(userIntegrationsTable).where(eq(userIntegrationsTable.userId, userId));

    const integrationMap = new Map(existingIntegrations.map(i => [i.provider, i]));
    const integrations = INTEGRATION_PROVIDERS.map(provider => ({
      provider,
      isConnected: integrationMap.get(provider)?.isConnected ?? false,
      connectedAt: integrationMap.get(provider)?.connectedAt ?? null,
      lastSyncAt: integrationMap.get(provider)?.lastSyncAt ?? null,
    }));

    res.json({ ...extendedProfile(user), integrations });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.put("/users/me/profile", authenticate, async (req, res) => {
  const parsed = extendedProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const data = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.primaryGoal !== undefined) updateData["primaryGoal"] = data.primaryGoal;
    if (data.fitnessLevel !== undefined) updateData["fitnessLevel"] = data.fitnessLevel;
    if (data.injuries !== undefined) updateData["injuries"] = data.injuries;
    if (data.secondaryGoal !== undefined) updateData["secondaryGoal"] = data.secondaryGoal;
    if (data.sessionDurationMin !== undefined) updateData["sessionDurationMin"] = data.sessionDurationMin;
    if (data.sessionDurationMax !== undefined) updateData["sessionDurationMax"] = data.sessionDurationMax;
    if (data.availableDays !== undefined) updateData["availableDays"] = data.availableDays;
    if (data.trainingLocations !== undefined) updateData["trainingLocations"] = data.trainingLocations;
    if (data.equipment !== undefined) updateData["equipment"] = data.equipment;
    if (data.avoidedExercises !== undefined) updateData["avoidedExercises"] = data.avoidedExercises;
    if (data.favoriteExercises !== undefined) updateData["favoriteExercises"] = data.favoriteExercises;
    if (data.language !== undefined) updateData["language"] = data.language;
    if (data.theme !== undefined) updateData["theme"] = data.theme;
    if (data.units !== undefined) updateData["units"] = data.units;
    if (data.privacySettings !== undefined) updateData["privacySettings"] = data.privacySettings;
    if (data.morningNotifHour !== undefined) updateData["morningNotifHour"] = data.morningNotifHour;
    if (data.notificationPrefs !== undefined) updateData["notificationPrefs"] = data.notificationPrefs;
    const userId = req.user!.userId;
    const [user] = await db.update(usersTable)
      .set(updateData as Partial<typeof usersTable.$inferInsert>)
      .where(eq(usersTable.id, userId))
      .returning();

    const existingIntegrations = await db.select({
      provider: userIntegrationsTable.provider,
      isConnected: userIntegrationsTable.isConnected,
      connectedAt: userIntegrationsTable.connectedAt,
      lastSyncAt: userIntegrationsTable.lastSyncAt,
    }).from(userIntegrationsTable).where(eq(userIntegrationsTable.userId, userId));

    const integrationMap = new Map(existingIntegrations.map(i => [i.provider, i]));
    const integrations = INTEGRATION_PROVIDERS.map(provider => ({
      provider,
      isConnected: integrationMap.get(provider)?.isConnected ?? false,
      connectedAt: integrationMap.get(provider)?.connectedAt ?? null,
      lastSyncAt: integrationMap.get(provider)?.lastSyncAt ?? null,
    }));

    res.json({ ...extendedProfile(user), integrations });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

const VALID_PROVIDERS = ["apple_health", "garmin", "strava", "whoop", "fitbit"] as const;

router.post("/users/me/integrations/:provider/connect", authenticate, async (req, res) => {
  const provider = req.params["provider"] as string;
  if (!(VALID_PROVIDERS as readonly string[]).includes(provider)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: t(req.locale, "errors.providerNotRecognized") } });
    return;
  }
  try {
    const userId = req.user!.userId;
    const encryptedStubToken = encryptToken(`stub:${provider}:${userId}:${Date.now()}`);
    await db.insert(userIntegrationsTable).values({
      userId,
      provider,
      isConnected: true,
      accessToken: encryptedStubToken,
      connectedAt: new Date(),
    }).onConflictDoUpdate({
      target: [userIntegrationsTable.userId, userIntegrationsTable.provider],
      set: { isConnected: true, accessToken: encryptedStubToken, connectedAt: new Date(), updatedAt: new Date() },
    });
    res.json({ provider, isConnected: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.delete("/users/me/integrations/:provider", authenticate, async (req, res) => {
  const provider = req.params["provider"] as string;
  if (!(VALID_PROVIDERS as readonly string[]).includes(provider)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: t(req.locale, "errors.providerNotRecognized") } });
    return;
  }
  try {
    const userId = req.user!.userId;
    await db.update(userIntegrationsTable)
      .set({ isConnected: false, accessToken: null, refreshToken: null, updatedAt: new Date() })
      .where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, provider)));
    res.json({ provider, isConnected: false });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

const statsOrderSchema = z.object({
  order: z.array(z.string()).min(1).max(20),
});

router.get("/users/me/stats-order", authenticate, async (req, res) => {
  try {
    const [user] = await db.select({ statsOrder: usersTable.statsOrder }).from(usersTable).where(eq(usersTable.id, req.user!.userId));
    return res.json({ order: user?.statsOrder ?? null });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.put("/users/me/stats-order", authenticate, async (req, res) => {
  try {
    const parsed = statsOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    }
    await db.update(usersTable).set({ statsOrder: parsed.data.order, updatedAt: new Date() }).where(eq(usersTable.id, req.user!.userId));
    return res.json({ order: parsed.data.order });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

router.get("/users/weekly-recap/latest", authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(weekStart.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekEnd.getDate() - 6);
    prevWeekStart.setHours(0, 0, 0, 0);
    prevWeekEnd.setHours(23, 59, 59, 999);

    async function getWeekStats(start: Date, end: Date) {
      const weekStartDate = start.toISOString().split("T")[0];
      const weekEndDate = end.toISOString().split("T")[0];

      const [sessions] = await db.select({ cnt: count() }).from(sessionLogsTable)
        .where(and(
          eq(sessionLogsTable.athleteId, userId),
          sql`${sessionLogsTable.completedAt} >= ${start}`,
          sql`${sessionLogsTable.completedAt} <= ${end}`
        ));

      const scoreResult = await db.execute(sql`
        SELECT AVG(adapt_score::float) as avg FROM checkins 
        WHERE athlete_id = ${userId} AND date >= ${weekStartDate} AND date <= ${weekEndDate}
      `);
      const scoreRow = scoreResult.rows[0] as { avg: string | null } | undefined;
      const avgAdaptScore = scoreRow?.avg ? parseFloat(scoreRow.avg) : null;

      const rpeResult = await db.execute(sql`
        SELECT AVG(rpe::float) as avg FROM session_logs
        WHERE athlete_id = ${userId} AND rpe IS NOT NULL
        AND completed_at >= ${start} AND completed_at <= ${end}
      `);
      const rpeRow = rpeResult.rows[0] as { avg: string | null } | undefined;
      const avgRpe = rpeRow?.avg ? parseFloat(rpeRow.avg) : null;

      const volResult = await db.execute(sql`
        SELECT COALESCE(SUM(
          el.load_kg_used::float * el.sets_completed
        ), 0) as total
        FROM exercise_logs el
        JOIN session_logs sl ON el.session_log_id = sl.id
        WHERE sl.athlete_id = ${userId} AND sl.completed_at >= ${start} AND sl.completed_at <= ${end}
        AND el.load_kg_used IS NOT NULL AND el.sets_completed IS NOT NULL
      `);
      const volRow = volResult.rows[0] as { total: string } | undefined;
      const totalVolume = parseFloat(String(volRow?.total ?? "0"));

      const prsResult = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM personal_records
        WHERE user_id = ${userId} AND achieved_at >= ${start} AND achieved_at <= ${end}
      `);
      const prsRow = prsResult.rows[0] as { cnt: string } | undefined;
      const prsCount = Number(prsRow?.cnt ?? 0);

      return {
        sessions: Number(sessions?.cnt ?? 0),
        avgAdaptScore,
        avgRpe,
        totalVolume,
        prsCount,
      };
    }

    const [[thisWeek, lastWeek], activePrograms] = await Promise.all([
      Promise.all([
        getWeekStats(weekStart, weekEnd),
        getWeekStats(prevWeekStart, prevWeekEnd),
      ]),
      db.select({ id: programsTable.id, startDate: programsTable.startDate })
        .from(programsTable)
        .where(and(eq(programsTable.athleteId, userId), eq(programsTable.isActive, true)))
        .limit(1),
    ]);

    let sessionsPlanned = 0;
    if (activePrograms.length > 0) {
      const prog = activePrograms[0];
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const startMs = prog.startDate ? new Date(prog.startDate).getTime() : weekStart.getTime();
      const weekNum = Math.max(1, Math.floor((weekStart.getTime() - startMs) / msPerWeek) + 1);
      const [planCount] = await db.select({ cnt: count() })
        .from(sessionsTable)
        .where(and(eq(sessionsTable.programId, prog.id), eq(sessionsTable.weekNumber, weekNum)));
      sessionsPlanned = Number(planCount?.cnt ?? 0);
    }

    res.json({
      recap: {
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        sessionsCompleted: thisWeek.sessions,
        sessionsPlanned,
        avgAdaptScore: thisWeek.avgAdaptScore,
        avgRpe: thisWeek.avgRpe,
        totalVolumeKg: thisWeek.totalVolume,
        prsCount: thisWeek.prsCount,
        sessionsDelta: thisWeek.sessions - lastWeek.sessions,
        scoreDelta: thisWeek.avgAdaptScore != null && lastWeek.avgAdaptScore != null
          ? parseFloat((thisWeek.avgAdaptScore - lastWeek.avgAdaptScore).toFixed(1)) : null,
        rpeDelta: thisWeek.avgRpe != null && lastWeek.avgRpe != null
          ? parseFloat((thisWeek.avgRpe - lastWeek.avgRpe).toFixed(1)) : null,
        volumeDelta: thisWeek.totalVolume - lastWeek.totalVolume,
      },
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: t(req.locale, "errors.serverError") } });
  }
});

export default router;
