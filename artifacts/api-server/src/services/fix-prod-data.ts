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

  // Web Push subscriptions storage (task #209) — array of { endpoint, keys, createdAt }
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS web_push_subscriptions jsonb DEFAULT '[]'::jsonb`);
    logger.info("runSchemaMigrations: web_push_subscriptions column OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – web_push_subscriptions column failed");
    throw err;
  }

  // User session templates (task #211 — Mes routines)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_session_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id uuid NOT NULL REFERENCES users(id),
        name varchar(100) NOT NULL,
        exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS user_session_templates_athlete_idx ON user_session_templates(athlete_id)`);
    logger.info("runSchemaMigrations: user_session_templates OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – user_session_templates creation failed");
    throw err;
  }

  // Mouv'Up Phase 1 — athlete PIN auth, extended sport intake, GDPR consent
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(30)`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_code_hash varchar(255)`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_injury_history boolean`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_contraindication boolean`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_source varchar(50)`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_version varchar(20)`);
    logger.info("runSchemaMigrations: users Mouv'Up auth/intake columns OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – users Mouv'Up auth/intake columns failed");
    throw err;
  }

  // Mouv'Up Phase 1 — studio_settings (one row per coach: WhatsApp number, VAT
  // regime, default cancellation window, invoice prefix... — see lib/db/src/schema/studio_settings.ts)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS studio_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        studio_name varchar(150) NOT NULL DEFAULT 'Mouv''Up',
        studio_address text,
        whatsapp_number varchar(30),
        announcement_link text,
        default_cancellation_window_hours integer NOT NULL DEFAULT 24,
        vat_regime varchar(20) NOT NULL DEFAULT 'franchise',
        vat_number varchar(30),
        invoice_prefix varchar(10) NOT NULL DEFAULT 'NH',
        accountant_email varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    logger.info("runSchemaMigrations: studio_settings OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – studio_settings creation failed");
    throw err;
  }

  // Mouv'Up Phase 2 — shop catalogue (packs/promos/subscription plans)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shop_packs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credit_type varchar(20) NOT NULL,
        name varchar(100) NOT NULL,
        credits integer NOT NULL,
        price_cents integer NOT NULL,
        validity_months integer,
        tag varchar(30),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shop_promos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pack_id uuid NOT NULL REFERENCES shop_packs(id) ON DELETE CASCADE,
        discounted_price_cents integer NOT NULL,
        starts_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        created_by uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS shop_promos_pack_idx ON shop_promos(pack_id, expires_at)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        price_cents integer NOT NULL,
        presential_text varchar(100),
        tag varchar(30),
        engagement_months integer,
        is_active boolean NOT NULL DEFAULT true,
        stripe_price_id varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id uuid NOT NULL REFERENCES subscription_plans(id),
        stripe_subscription_id varchar(255),
        status varchar(20) NOT NULL DEFAULT 'active',
        started_at timestamptz NOT NULL DEFAULT now(),
        engagement_ends_at timestamptz,
        current_period_end timestamptz,
        canceled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    logger.info("runSchemaMigrations: shop catalogue tables OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – shop catalogue tables failed");
    throw err;
  }

  // Mouv'Up Phase 2 — credit ledger (batches with per-purchase expiry, not a flat counter)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS credit_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credit_type varchar(20) NOT NULL,
        credits_total integer NOT NULL,
        credits_remaining integer NOT NULL,
        source varchar(20) NOT NULL,
        pack_id uuid REFERENCES shop_packs(id),
        stripe_payment_intent_id varchar(255),
        price_paid_cents integer,
        purchased_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz,
        note text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS credit_batches_athlete_idx ON credit_batches(athlete_id, credit_type, expires_at)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS credit_batches_payment_intent_idx ON credit_batches(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        batch_id uuid NOT NULL REFERENCES credit_batches(id) ON DELETE CASCADE,
        delta integer NOT NULL,
        reason varchar(30) NOT NULL,
        related_booking_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS credit_transactions_booking_idx ON credit_transactions(related_booking_id)`);
    logger.info("runSchemaMigrations: credit ledger tables OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – credit ledger tables failed");
    throw err;
  }

  // Mouv'Up Phase 3 — group class booking + waitlist
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS class_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        description text,
        capacity integer NOT NULL DEFAULT 12,
        price_cents integer NOT NULL DEFAULT 0,
        credit_cost integer NOT NULL DEFAULT 1,
        duration_min integer NOT NULL DEFAULT 60,
        cancellation_window_hours integer,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS class_recurrence_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id uuid NOT NULL REFERENCES class_templates(id) ON DELETE CASCADE,
        day_of_week smallint NOT NULL,
        start_time varchar(5) NOT NULL,
        effective_from timestamptz NOT NULL DEFAULT now(),
        effective_until timestamptz,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS class_occurrences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id uuid NOT NULL REFERENCES class_templates(id) ON DELETE CASCADE,
        coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recurrence_rule_id uuid REFERENCES class_recurrence_rules(id),
        start_at timestamptz NOT NULL,
        duration_min integer NOT NULL,
        capacity integer NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'scheduled',
        cancelled_at timestamptz,
        cancellation_note text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS class_occurrences_start_idx ON class_occurrences(start_at, status)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS class_bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        occurrence_id uuid NOT NULL REFERENCES class_occurrences(id) ON DELETE CASCADE,
        athlete_id uuid REFERENCES users(id) ON DELETE CASCADE,
        guest_name varchar(150),
        status varchar(20) NOT NULL DEFAULT 'confirmed',
        payment_mode varchar(20) NOT NULL,
        payment_status varchar(20) NOT NULL DEFAULT 'paid',
        stripe_payment_intent_id varchar(255),
        registered_by varchar(20) NOT NULL DEFAULT 'self',
        late_cancellation boolean NOT NULL DEFAULT false,
        late_cancellation_waived boolean NOT NULL DEFAULT false,
        cancelled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS class_bookings_occurrence_idx ON class_bookings(occurrence_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS class_bookings_athlete_idx ON class_bookings(athlete_id, status)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS class_waitlist_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        occurrence_id uuid NOT NULL REFERENCES class_occurrences(id) ON DELETE CASCADE,
        athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status varchar(20) NOT NULL DEFAULT 'waiting',
        offered_at timestamptz,
        offer_expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS class_waitlist_occurrence_idx ON class_waitlist_entries(occurrence_id, status, created_at)`);
    logger.info("runSchemaMigrations: class booking + waitlist tables OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – class booking + waitlist tables failed");
    throw err;
  }

  // Mouv'Up Phase 4 — 1:1 booking (request/confirm on top of the existing
  // coach_appointments table, plus the coach's recurring availability template)
  try {
    await db.execute(sql`ALTER TABLE coach_appointments ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'confirmed'`);
    await db.execute(sql`ALTER TABLE coach_appointments ADD COLUMN IF NOT EXISTS requested_by varchar(20)`);
    await db.execute(sql`ALTER TABLE coach_appointments ADD COLUMN IF NOT EXISTS availability_slot_id uuid`);
    await db.execute(sql`ALTER TABLE coach_appointments ADD COLUMN IF NOT EXISTS cancelled_at timestamptz`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS coach_availability_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day_of_week smallint NOT NULL,
        start_time varchar(5) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS coach_availability_slots_coach_idx ON coach_availability_slots(coach_id, day_of_week, is_active)`);
    logger.info("runSchemaMigrations: 1:1 booking (coach_appointments extension + coach_availability_slots) OK");
  } catch (err) {
    logger.error({ err }, "runSchemaMigrations: FATAL – 1:1 booking tables failed");
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

  try {
    await fixLmjTrainerRole();
  } catch (err) {
    logger.error({ err }, "fixProdData: erreur correction rôle lmj-trainer");
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

async function fixLmjTrainerRole(): Promise<void> {
  const [user] = await db
    .select({ id: usersTable.id, role: usersTable.role, isActive: usersTable.isActive })
    .from(usersTable)
    .where(eq(usersTable.email, "lmj-trainer@hotmail.com"))
    .limit(1);

  if (!user) return;

  if (user.role !== "coach" || !user.isActive) {
    await db.update(usersTable)
      .set({ role: "coach", isActive: true, coachId: null })
      .where(eq(usersTable.email, "lmj-trainer@hotmail.com"));
    logger.info("fixProdData: lmj-trainer@hotmail.com → role=coach, isActive=true");
  }
}
