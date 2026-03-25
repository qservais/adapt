import { Router } from "express";
import { db } from "@workspace/db";
import {
  challengesTable,
  challengeAssignmentsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, lte, gte, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

const CreateChallengeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  metric: z.enum(["reps", "distance", "time", "sessions"]),
  target: z.number().positive(),
  unit: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  athleteIds: z.array(z.string().uuid()).min(1),
});

const UpdateProgressSchema = z.object({
  progress: z.number().min(0),
});

router.post("/coach/challenges", authenticate, requireRole("coach"), async (req, res) => {
  const coachId = req.user!.userId;
  const parsed = CreateChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.issues });
    return;
  }
  const { athleteIds, ...rest } = parsed.data;

  const athletes = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.coachId, coachId), eq(usersTable.role, "athlete")));
  const validAthleteIds = new Set(athletes.map(a => a.id));
  const invalid = athleteIds.filter(id => !validAthleteIds.has(id));
  if (invalid.length > 0) {
    res.status(403).json({ error: "Athlètes non autorisés" });
    return;
  }

  const [challenge] = await db.insert(challengesTable).values({
    coachId,
    title: rest.title,
    description: rest.description ?? null,
    metric: rest.metric,
    target: String(rest.target),
    unit: rest.unit ?? null,
    type: "individual",
    startDate: rest.startDate,
    endDate: rest.endDate,
  }).returning();

  await db.insert(challengeAssignmentsTable).values(
    athleteIds.map(athleteId => ({
      challengeId: challenge!.id,
      athleteId,
      progress: "0",
    }))
  );

  res.status(201).json({ id: challenge!.id });
});

router.get("/coach/challenges", authenticate, requireRole("coach"), async (req, res) => {
  const coachId = req.user!.userId;
  const challenges = await db.select().from(challengesTable)
    .where(eq(challengesTable.coachId, coachId))
    .orderBy(desc(challengesTable.createdAt));

  const result = await Promise.all(challenges.map(async (c) => {
    const assignments = await db
      .select({
        id: challengeAssignmentsTable.id,
        athleteId: challengeAssignmentsTable.athleteId,
        progress: challengeAssignmentsTable.progress,
        completedAt: challengeAssignmentsTable.completedAt,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(challengeAssignmentsTable)
      .leftJoin(usersTable, eq(challengeAssignmentsTable.athleteId, usersTable.id))
      .where(eq(challengeAssignmentsTable.challengeId, c.id));

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      metric: c.metric,
      target: Number(c.target),
      unit: c.unit,
      type: c.type,
      startDate: c.startDate,
      endDate: c.endDate,
      createdAt: c.createdAt,
      assignments: assignments.map(a => ({
        athleteId: a.athleteId,
        athleteName: `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim(),
        progress: Number(a.progress),
        completedAt: a.completedAt,
      })),
    };
  }));

  res.json(result);
});

router.put("/coach/challenges/:id", authenticate, requireRole("coach"), async (req, res) => {
  const coachId = req.user!.userId;
  const { id } = req.params;

  const [challenge] = await db.select().from(challengesTable)
    .where(and(eq(challengesTable.id, id), eq(challengesTable.coachId, coachId)));
  if (!challenge) {
    res.status(404).json({ error: "Challenge introuvable" });
    return;
  }

  const parsed = CreateChallengeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }

  const { athleteIds, ...rest } = parsed.data;
  const updateData: Partial<typeof challengesTable.$inferInsert> = {};
  if (rest.title) updateData.title = rest.title;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.metric) updateData.metric = rest.metric;
  if (rest.target !== undefined) updateData.target = String(rest.target);
  if (rest.unit !== undefined) updateData.unit = rest.unit;
  if (rest.startDate) updateData.startDate = rest.startDate;
  if (rest.endDate) updateData.endDate = rest.endDate;

  await db.update(challengesTable).set(updateData).where(eq(challengesTable.id, id));
  res.json({ ok: true });
});

router.delete("/coach/challenges/:id", authenticate, requireRole("coach"), async (req, res) => {
  const coachId = req.user!.userId;
  const { id } = req.params;

  const [challenge] = await db.select().from(challengesTable)
    .where(and(eq(challengesTable.id, id), eq(challengesTable.coachId, coachId)));
  if (!challenge) {
    res.status(404).json({ error: "Challenge introuvable" });
    return;
  }

  await db.delete(challengesTable).where(eq(challengesTable.id, id));
  res.json({ ok: true });
});

router.get("/challenges/active", authenticate, async (req, res) => {
  const athleteId = req.user!.userId;
  const today = new Date().toISOString().split("T")[0]!;

  const rows = await db
    .select({
      id: challengesTable.id,
      title: challengesTable.title,
      description: challengesTable.description,
      metric: challengesTable.metric,
      target: challengesTable.target,
      unit: challengesTable.unit,
      startDate: challengesTable.startDate,
      endDate: challengesTable.endDate,
      progress: challengeAssignmentsTable.progress,
      completedAt: challengeAssignmentsTable.completedAt,
      assignmentId: challengeAssignmentsTable.id,
    })
    .from(challengeAssignmentsTable)
    .leftJoin(challengesTable, eq(challengeAssignmentsTable.challengeId, challengesTable.id))
    .where(
      and(
        eq(challengeAssignmentsTable.athleteId, athleteId),
        lte(challengesTable.startDate, today),
        gte(challengesTable.endDate, today),
      )
    )
    .orderBy(challengesTable.endDate);

  const result = rows.map(r => ({
    id: r.id!,
    title: r.title!,
    description: r.description,
    metric: r.metric!,
    target: Number(r.target),
    unit: r.unit,
    startDate: r.startDate!,
    endDate: r.endDate!,
    progress: Number(r.progress ?? 0),
    completedAt: r.completedAt ?? null,
    assignmentId: r.assignmentId,
  }));

  res.json(result);
});

router.get("/challenges/:id", authenticate, async (req, res) => {
  const athleteId = req.user!.userId;
  const { id } = req.params;

  const [row] = await db
    .select({
      id: challengesTable.id,
      title: challengesTable.title,
      description: challengesTable.description,
      metric: challengesTable.metric,
      target: challengesTable.target,
      unit: challengesTable.unit,
      startDate: challengesTable.startDate,
      endDate: challengesTable.endDate,
      progress: challengeAssignmentsTable.progress,
      completedAt: challengeAssignmentsTable.completedAt,
      assignmentId: challengeAssignmentsTable.id,
    })
    .from(challengeAssignmentsTable)
    .leftJoin(challengesTable, eq(challengeAssignmentsTable.challengeId, challengesTable.id))
    .where(
      and(
        eq(challengeAssignmentsTable.athleteId, athleteId),
        eq(challengesTable.id, id),
      )
    );

  if (!row) {
    res.status(404).json({ error: "Challenge introuvable" });
    return;
  }

  res.json({
    id: row.id!,
    title: row.title!,
    description: row.description,
    metric: row.metric!,
    target: Number(row.target),
    unit: row.unit,
    startDate: row.startDate!,
    endDate: row.endDate!,
    progress: Number(row.progress ?? 0),
    completedAt: row.completedAt ?? null,
    assignmentId: row.assignmentId,
  });
});

router.put("/challenges/:id/progress", authenticate, async (req, res) => {
  const athleteId = req.user!.userId;
  const { id } = req.params;

  const parsed = UpdateProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Progression invalide" });
    return;
  }

  const [assignment] = await db
    .select({ id: challengeAssignmentsTable.id, target: challengesTable.target })
    .from(challengeAssignmentsTable)
    .leftJoin(challengesTable, eq(challengeAssignmentsTable.challengeId, challengesTable.id))
    .where(
      and(
        eq(challengeAssignmentsTable.athleteId, athleteId),
        eq(challengesTable.id, id),
      )
    );

  if (!assignment) {
    res.status(404).json({ error: "Challenge introuvable" });
    return;
  }

  const target = Number(assignment.target);
  const newProgress = Math.min(parsed.data.progress, target);
  const completedAt = newProgress >= target ? new Date() : null;

  await db.update(challengeAssignmentsTable)
    .set({
      progress: String(newProgress),
      completedAt: completedAt ?? undefined,
    })
    .where(eq(challengeAssignmentsTable.id, assignment.id));

  res.json({ progress: newProgress, completedAt });
});

export default router;
