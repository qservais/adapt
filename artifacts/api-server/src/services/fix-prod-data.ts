import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const LMJCOACH_HASH =
  "$2b$12$6sgAadix1kqObp3MZkKeru7JhIABSI9EjoqzSuWZDd5biJN1aEVci";
const OWEN_HASH =
  "$2b$12$tVjcXUqssr8mKfuYzW8K8e7894xtmfoPD0S.JKXp0cLGPjYOyph/e";

const TEST_EMAILS_TO_REMOVE = [
  "dylandecoster7@outlook.com",
  "julien@adapt.demo",
  "lmj-trainer@hotmail.com",
  "marie@adapt.demo",
  "quentin.servais@hotmail.be",
  "quentin.servais@hotmail.fr",
  "sara@adapt.demo",
];

export async function fixProdData(): Promise<void> {
  try {
    const oldCoach = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "coach@adapt.demo"))
      .limit(1);

    if (oldCoach.length === 0) {
      return;
    }

    const oldCoachId = oldCoach[0]!.id;
    logger.info("fixProdData: ancien compte coach détecté, correction en cours");

    const lmj = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "loicmehdi@msn.com"))
      .limit(1);

    if (lmj.length === 0) {
      logger.warn("fixProdData: loicmehdi@msn.com introuvable, abandon");
      return;
    }

    const newCoachId = lmj[0]!.id;

    await db
      .update(usersTable)
      .set({ role: "coach", passwordHash: LMJCOACH_HASH, coachId: null })
      .where(eq(usersTable.id, newCoachId));

    await db
      .update(usersTable)
      .set({ coachId: newCoachId })
      .where(eq(usersTable.coachId, oldCoachId));

    await db
      .delete(usersTable)
      .where(eq(usersTable.email, "coach@adapt.demo"));

    await db
      .update(usersTable)
      .set({ passwordHash: OWEN_HASH })
      .where(eq(usersTable.email, "o.soontjens@gmail.com"));

    await db
      .update(usersTable)
      .set({ coachId: newCoachId })
      .where(eq(usersTable.email, "tom@adapt.demo"));

    for (const email of TEST_EMAILS_TO_REMOVE) {
      await db.execute(
        sql`UPDATE users SET coach_id = NULL WHERE coach_id IN (SELECT id FROM users WHERE email = ${email})`,
      );
      await db.delete(usersTable).where(eq(usersTable.email, email));
    }

    logger.info("fixProdData: correction terminée avec succès");
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur lors de la correction");
  }
}
