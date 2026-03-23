import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function ensureAthleteInviteCodes(): Promise<void> {
  try {
    const athletes = await db.select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(and(eq(usersTable.role, "athlete"), isNull(usersTable.inviteCode)));

    if (athletes.length === 0) return;

    const existingCodes = await db.select({ code: usersTable.inviteCode })
      .from(usersTable)
      .where(eq(usersTable.role, "athlete"));

    const usedCodes = new Set(existingCodes.map(r => r.code).filter(Boolean));

    for (const athlete of athletes) {
      let code: string;
      let attempts = 0;
      do {
        code = generateInviteCode();
        attempts++;
        if (attempts > 100) throw new Error("Failed to generate unique invite code");
      } while (usedCodes.has(code));

      usedCodes.add(code);
      await db.update(usersTable)
        .set({ inviteCode: code })
        .where(eq(usersTable.id, athlete.id));

      logger.info({ athleteId: athlete.id }, "Generated invite code for athlete");
    }

    logger.info({ count: athletes.length }, "Invite code migration complete");
  } catch (err) {
    logger.error({ err }, "Failed to run invite code migration");
  }
}
