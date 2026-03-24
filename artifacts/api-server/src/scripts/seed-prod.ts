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
  const guidesExist = psql("SELECT COUNT(*) FROM guides");
  if (guidesExist === "0") {
    runSqlFile(join(__dirname, "seed-content.sql"), "seed-content.sql");
  } else {
    console.log("✅ Content seed déjà présent (guides + routines)");
  }

  // Verify final state
  const userCount = psql("SELECT COUNT(*) FROM users");
  const programCount = psql("SELECT COUNT(*) FROM programs");
  const sessionCount = psql("SELECT COUNT(*) FROM sessions");
  const guidesCount = psql("SELECT COUNT(*) FROM guides");
  const routinesCount = psql("SELECT COUNT(*) FROM content_routines");

  console.log(`\n📊 État de la base:`);
  console.log(`   - ${userCount} utilisateurs`);
  console.log(`   - ${programCount} programmes`);
  console.log(`   - ${sessionCount} séances`);
  console.log(`   - ${guidesCount} guides`);
  console.log(`   - ${routinesCount} routines`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
