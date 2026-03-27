import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const LMJCOACH_HASH =
  "$2b$12$6sgAadix1kqObp3MZkKeru7JhIABSI9EjoqzSuWZDd5biJN1aEVci";
const OWEN_HASH =
  "$2b$12$tVjcXUqssr8mKfuYzW8K8e7894xtmfoPD0S.JKXp0cLGPjYOyph/e";

const TEST_EMAILS = [
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

    const needsCoachCleanup = oldCoach.length > 0;

    if (!needsCoachCleanup) {
      const owenRow = await db
        .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
        .from(usersTable)
        .where(eq(usersTable.email, "o.soontjens@gmail.com"))
        .limit(1);

      if (owenRow.length > 0 && owenRow[0]!.passwordHash !== OWEN_HASH) {
        await db
          .update(usersTable)
          .set({ passwordHash: OWEN_HASH })
          .where(eq(usersTable.email, "o.soontjens@gmail.com"));
        logger.info("fixProdData: mot de passe Owen mis à jour");
      }
      return;
    }

    const oldCoachId = oldCoach[0]!.id;
    logger.info("fixProdData: correction prod en cours");

    const lmj = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "loicmehdi@msn.com"))
      .limit(1);

    if (lmj.length === 0) {
      logger.warn("fixProdData: loicmehdi@msn.com introuvable");
      return;
    }

    const newCoachId = lmj[0]!.id;

    await db
      .update(usersTable)
      .set({ role: "coach", passwordHash: LMJCOACH_HASH, coachId: null, firstName: "Loïc Mehdi", lastName: "Jaumotte" })
      .where(eq(usersTable.id, newCoachId));

    await db
      .update(usersTable)
      .set({ coachId: newCoachId })
      .where(eq(usersTable.coachId, oldCoachId));

    await db
      .update(usersTable)
      .set({ passwordHash: OWEN_HASH })
      .where(eq(usersTable.email, "o.soontjens@gmail.com"));

    await db.execute(sql`UPDATE alerts SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE challenges SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE coach_appointments SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE coach_join_requests SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE content_routines SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE exercises SET created_by = NULL WHERE created_by = ${oldCoachId}`);
    await db.execute(sql`UPDATE guides SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE nutrition_pdfs SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE performance_tests SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE programs SET coach_id = ${newCoachId} WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`UPDATE scheduled_notifications SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
    await db.execute(sql`DELETE FROM messages WHERE sender_id = ${oldCoachId} OR recipient_id = ${oldCoachId}`);

    await db.delete(usersTable).where(eq(usersTable.email, "coach@adapt.demo"));

    await db
      .update(usersTable)
      .set({ isActive: false, coachId: null })
      .where(sql`email = ANY(${TEST_EMAILS})`);

    await db
      .update(usersTable)
      .set({ coachId: newCoachId })
      .where(eq(usersTable.email, "tom@adapt.demo"));

    logger.info("fixProdData: correction terminée avec succès");
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur");
  }
}
