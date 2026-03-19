import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

router.get("/users/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      fitnessLevel: user.fitnessLevel,
      primaryGoal: user.primaryGoal,
      cycleTracking: user.cycleTracking,
      coachId: user.coachId,
      inviteCode: user.inviteCode,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const updateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  age: z.number().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  primaryGoal: z.enum(["performance", "health", "aesthetic", "fitness"]).optional(),
  cycleTracking: z.boolean().optional(),
});

router.put("/users/me", authenticate, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  try {
    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    const [user] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, req.user!.userId)).returning();
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      fitnessLevel: user.fitnessLevel,
      primaryGoal: user.primaryGoal,
      cycleTracking: user.cycleTracking,
      coachId: user.coachId,
      inviteCode: user.inviteCode,
    });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
