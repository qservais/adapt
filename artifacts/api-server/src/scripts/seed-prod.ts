/**
 * Production seed script — runs during deployment build step.
 * Inserts demo data (coach, Owen, programs, sessions, variants, exercises)
 * into the target database if not already present.
 * Fully idempotent: all INSERTs use ON CONFLICT DO NOTHING.
 *
 * Run: pnpm --filter @workspace/api-server run seed
 */

import { execSync, spawnSync } from "child_process";
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

async function main() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est requis");
  }

  // Check if already seeded
  const existing = psql("SELECT COUNT(*) FROM users WHERE email = 'coach@adapt.demo'");
  if (existing === "1") {
    console.log("✅ Base déjà seedée — rien à faire.");
    return;
  }

  console.log("🌱 Seeding base de données production...");

  const sqlPath = join(__dirname, "seed.sql");

  const result = spawnSync(
    "psql",
    [databaseUrl, "-f", sqlPath, "-v", "ON_ERROR_STOP=1"],
    { encoding: "utf-8", timeout: 60000 }
  );

  if (result.status !== 0) {
    console.error("❌ Seed échoué:", result.stderr);
    process.exit(1);
  }

  // Verify
  const userCount = psql("SELECT COUNT(*) FROM users WHERE email IN ('coach@adapt.demo', 'o.soontjens@gmail.com')");
  const sessionCount = psql("SELECT COUNT(*) FROM sessions");
  const exerciseCount = psql("SELECT COUNT(*) FROM session_exercises");

  console.log(`✅ Seed terminé:`);
  console.log(`   - ${userCount} utilisateurs demo`);
  console.log(`   - ${sessionCount} séances`);
  console.log(`   - ${exerciseCount} exercices de séance`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
