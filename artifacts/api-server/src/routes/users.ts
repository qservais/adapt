import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

function userProfile(user: typeof usersTable.$inferSelect) {
  return {
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
  };
}

router.get("/users/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json(userProfile(user));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  age: z.number().int().min(10).max(120).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  heightCm: z.number().int().min(50).max(300).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  primaryGoal: z.enum(["strength", "muscle", "fat_loss", "performance", "health", "aesthetic", "fitness"]).optional(),
  cycleTracking: z.boolean().optional(),
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
        ...(data.age !== undefined && { age: data.age }),
        ...(data.weightKg !== undefined && { weightKg: data.weightKg.toString() }),
        ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
        ...(data.fitnessLevel !== undefined && { fitnessLevel: data.fitnessLevel }),
        ...(data.primaryGoal !== undefined && { primaryGoal: data.primaryGoal }),
        ...(data.cycleTracking !== undefined && { cycleTracking: data.cycleTracking }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json(userProfile(user));
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
