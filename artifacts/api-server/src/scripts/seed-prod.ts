/**
 * Production seed script — runs during deployment build step.
 * Fully idempotent: all INSERTs use ON CONFLICT DO NOTHING.
 *
 * Step 1: if coach@adapt.demo absent → run seed.sql (base data: coach + Owen + programs)
 * Step 2: if sara@adapt.demo absent  → run seed-patch.sql (demo athletes: Sara/Tom/Marie/Julien/Quentin)
 *
 * Run: pnpm --filter @workspace/api-server run seed
 */

import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { seedExercises } from "./seed-exercises.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function psql(query: string): string {
  const result = spawnSync("psql", [process.env["DATABASE_URL"]!, "-t", "-A", "-c", query], {
    encoding: "utf-8",
    timeout: 10000,
  });
  if (result.status !== 0) {
    throw new Error(`psql error: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function psqlSafe(query: string): string | null {
  const result = spawnSync("psql", [process.env["DATABASE_URL"]!, "-t", "-A", "-c", query], {
    encoding: "utf-8",
    timeout: 10000,
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function tableExists(tableName: string): boolean {
  const result = psqlSafe(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}')`
  );
  return result === "t";
}

function runSqlFile(filePath: string, label: string): void {
  console.log(`🌱 Exécution ${label}...`);
  const result = spawnSync(
    "psql",
    [process.env["DATABASE_URL"]!, "-f", filePath, "-v", "ON_ERROR_STOP=1"],
    { encoding: "utf-8", timeout: 120000 }
  );
  if (result.status !== 0) {
    console.error(`❌ ${label} échoué:`, result.stderr);
    process.exit(1);
  }
  console.log(`✅ ${label} terminé`);
}

async function main() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est requis");
  }

  // Guard: if core tables don't exist yet, schema migrations haven't run.
  // Exit gracefully — the schema push step must complete first.
  if (!tableExists("users")) {
    console.log("⚠️  Tables absentes — les migrations n'ont pas encore été appliquées. Abandon du seed.");
    console.log("   Relancer le build après que les migrations aient été appliquées.");
    process.exit(0);
  }

  // Step 1: Base seed (coach + Owen + exercises + Owen's programs)
  const coachExists = psql("SELECT COUNT(*) FROM users WHERE email = 'coach@adapt.demo'");
  if (coachExists === "0") {
    runSqlFile(join(__dirname, "seed.sql"), "seed.sql");
  } else {
    console.log("✅ Base seed déjà présente (coach@adapt.demo)");
  }

  // Step 2: Patch seed (Sara, Tom, Marie, Julien, Quentin + leurs programmes)
  const saraExists = psql("SELECT COUNT(*) FROM users WHERE email = 'sara@adapt.demo'");
  if (saraExists === "0") {
    runSqlFile(join(__dirname, "seed-patch.sql"), "seed-patch.sql");
  } else {
    console.log("✅ Patch seed déjà présent (athlètes demo)");
  }

  // Step 3: Content seed (guides éducatifs + routines bibliothèque)
  const guidesExist = tableExists("guides")
    ? psql("SELECT COUNT(*) FROM guides")
    : "0";
  if (guidesExist === "0") {
    if (tableExists("guides")) {
      runSqlFile(join(__dirname, "seed-content.sql"), "seed-content.sql");
    } else {
      console.log("⚠️  Table guides absente — seed-content ignoré (migrations requises)");
    }
  } else {
    console.log("✅ Content seed déjà présent (guides + routines)");
  }

  // Step 4: Exercises seed (bibliothèque 100+ exercices pré-remplis)
  if (!tableExists("exercises")) {
    console.log("⚠️  Table exercises absente — seed exercices ignoré (migrations requises)");
  } else {
    const globalExerciseCount = psql("SELECT COUNT(*) FROM exercises WHERE created_by IS NULL");
    if (parseInt(globalExerciseCount, 10) < 100) {
      console.log("🌱 Exécution seed-exercises.ts...");
      const { inserted, levelUpdated, categoryUpdated } = await seedExercises();
      console.log(`✅ Seed exercices terminé (+${inserted} insérés, ${levelUpdated} niveaux mis à jour, ${categoryUpdated} catégories corrigées)`);
    } else {
      console.log(`✅ Bibliothèque d'exercices déjà remplie (${globalExerciseCount} exercices globaux)`);
      await seedExercises();
    }
  }

  // Verify final state
  const userCount = psqlSafe("SELECT COUNT(*) FROM users") ?? "?";
  const programCount = psqlSafe("SELECT COUNT(*) FROM programs") ?? "?";
  const sessionCount = psqlSafe("SELECT COUNT(*) FROM sessions") ?? "?";
  const guidesCount = psqlSafe("SELECT COUNT(*) FROM guides") ?? "?";
  const routinesCount = psqlSafe("SELECT COUNT(*) FROM content_routines") ?? "?";
  const exerciseCount = psqlSafe("SELECT COUNT(*) FROM exercises WHERE created_by IS NULL") ?? "?";

  console.log(`\n📊 État de la base:`);
  console.log(`   - ${userCount} utilisateurs`);
  console.log(`   - ${programCount} programmes`);
  console.log(`   - ${sessionCount} séances`);
  console.log(`   - ${guidesCount} guides`);
  console.log(`   - ${routinesCount} routines`);
  console.log(`   - ${exerciseCount} exercices globaux`);
}

main().catch((err) => {
  console.error("⚠  Seed non-fatal — le serveur démarrera quand même:", err);
  process.exit(0);
});
