import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function runSchemaMigrations(): Promise<void> {
  // Drop NOT NULL on athlete_id so templates (athleteId=null) can be inserted
  try {
    await db.execute(sql`ALTER TABLE programs ALTER COLUMN athlete_id DROP NOT NULL`);
    logger.info("runSchemaMigrations: athlete_id → nullable OK");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Postgres silently succeeds when column is already nullable; log other errors
    if (!msg.includes("does not have a not-null constraint")) {
      logger.warn({ err }, "runSchemaMigrations: athlete_id NOT NULL drop – non-fatal");
    }
  }

  // Create athlete_exercise_preferences table (missing in older prod deployments)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS athlete_exercise_preferences (
        athlete_id uuid NOT NULL REFERENCES users(id),
        exercise_id uuid NOT NULL REFERENCES exercises(id),
        preferred_sets integer,
        preferred_reps varchar(20),
        preferred_load_kg numeric(6,2),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (athlete_id, exercise_id)
      )
    `);
    logger.info("runSchemaMigrations: athlete_exercise_preferences OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – athlete_exercise_preferences creation failed");
    throw err;
  }

  // Add is_template column (missing in older prod deployments)
  try {
    await db.execute(sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false`);
    logger.info("runSchemaMigrations: is_template column OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – is_template column failed");
    throw err;
  }
}

const LMJCOACH_HASH =
  "$2b$12$6sgAadix1kqObp3MZkKeru7JhIABSI9EjoqzSuWZDd5biJN1aEVci";
const OWEN_HASH =
  "$2b$12$tVjcXUqssr8mKfuYzW8K8e7894xtmfoPD0S.JKXp0cLGPjYOyph/e";
const LUNA_HASH =
  "$2b$12$zX3JiisnPtVqoF0zIs4dpuj.3.I9XF/2RwZPZRfmFQuiEOSV.bNJi";

const TEST_EMAILS = [
  "dylandecoster7@outlook.com",
  "julien@adapt.demo",
  "lmj-trainer@hotmail.com",
  "marie@adapt.demo",
  "sara@adapt.demo",
];

const UNBLOCK_EMAILS = [
  "quentin.servais@hotmail.be",
  "quentin.servais@hotmail.fr",
];

export async function fixProdData(): Promise<void> {
  try {
    const oldCoach = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "coach@adapt.demo"))
      .limit(1);

    if (oldCoach.length > 0) {
      const oldCoachId = oldCoach[0]!.id;
      logger.info("fixProdData: correction prod en cours");

      const lmj = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, "loicmehdi@msn.com"))
        .limit(1);

      if (lmj.length === 0) {
        logger.warn("fixProdData: loicmehdi@msn.com introuvable");
      } else {
        const newCoachId = lmj[0]!.id;

        await db.update(usersTable).set({
          role: "coach",
          passwordHash: LMJCOACH_HASH,
          coachId: null,
          firstName: "Loïc Mehdi",
          lastName: "Jaumotte",
        }).where(eq(usersTable.id, newCoachId));

        await db.update(usersTable)
          .set({ coachId: newCoachId })
          .where(eq(usersTable.coachId, oldCoachId));

        await db.update(usersTable)
          .set({ passwordHash: OWEN_HASH })
          .where(eq(usersTable.email, "o.soontjens@gmail.com"));

        await db.execute(sql`UPDATE alerts SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`DELETE FROM scheduled_notifications WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`DELETE FROM coach_appointments WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`DELETE FROM coach_join_requests WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`UPDATE content_routines SET coach_id = ${newCoachId} WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`UPDATE exercises SET created_by = NULL WHERE created_by = ${oldCoachId}`);
        await db.execute(sql`UPDATE guides SET coach_id = ${newCoachId} WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`DELETE FROM nutrition_pdfs WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`UPDATE performance_tests SET coach_id = NULL WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`UPDATE programs SET coach_id = ${newCoachId} WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`DELETE FROM challenges WHERE coach_id = ${oldCoachId}`);
        await db.execute(sql`DELETE FROM messages WHERE sender_id = ${oldCoachId} OR recipient_id = ${oldCoachId}`);

        await db.delete(usersTable).where(eq(usersTable.email, "coach@adapt.demo"));

        await db.update(usersTable)
          .set({ coachId: newCoachId })
          .where(eq(usersTable.email, "tom@adapt.demo"));

        logger.info("fixProdData: correction terminée");
      }
    }
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur correction coach");
  }

  try {
    await deactivateTestAccounts();
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur désactivation comptes test");
  }

  try {
    await unblockAccounts();
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur déblocage comptes");
  }

  try {
    await ensureCoaches();
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur création coaches");
  }
}

async function deactivateTestAccounts(): Promise<void> {
  const active = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(inArray(usersTable.email, TEST_EMAILS));

  if (active.length === 0) return;

  await db.update(usersTable)
    .set({ isActive: false, coachId: null })
    .where(inArray(usersTable.email, TEST_EMAILS));

  logger.info({ count: active.length }, "fixProdData: comptes test désactivés");
}

async function unblockAccounts(): Promise<void> {
  const blocked = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(and(inArray(usersTable.email, UNBLOCK_EMAILS), eq(usersTable.isActive, false)));

  if (blocked.length === 0) return;

  await db.delete(usersTable).where(inArray(usersTable.id, blocked.map(u => u.id)));
  logger.info({ emails: blocked.map(u => u.email) }, "fixProdData: comptes bloqués supprimés (ré-inscription possible)");
}

async function ensureCoaches(): Promise<void> {
  const luna = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "lunabiot@hotmail.be"))
    .limit(1);

  if (luna.length === 0) {
    await db.insert(usersTable).values({
      email: "lunabiot@hotmail.be",
      passwordHash: LUNA_HASH,
      role: "coach",
      firstName: "Luna",
      lastName: "Biot",
    });
    logger.info("fixProdData: compte coach Luna Biot créé");
  }
}
