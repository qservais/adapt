/**
 * import-exercises-dataset.ts
 *
 * Bulk-imports the public exercises-dataset (github.com/hasaneyldrm/exercises-dataset,
 * 1324 exercises, MIT-licensed text/metadata) into the global exercise catalogue,
 * alongside the existing hand-curated 106-exercise French library (seed-exercises.ts,
 * untouched by this script — disjoint via externalSource).
 *
 * Media (thumbnail + GIF) is linked directly to the source repo's raw GitHub URLs
 * rather than re-hosted on our own object storage — no upload step, no storage
 * credentials needed, and it matches the existing demoUrl/demoGifUrl convention of
 * "any absolute URL a coach could have pasted in by hand". The media itself is
 * (c) Gym Visual — https://gymvisual.com/, redistributed by the dataset under a
 * permission grant to that project; hotlinking here doesn't copy it into our own
 * infrastructure, but if that license question ever needs re-examining, deleting
 * every row with externalSource = SOURCE removes 100% of this import cleanly.
 *
 * Idempotent: safe to re-run. Rows are matched by (externalSource, externalId),
 * so re-running updates existing rows in place instead of duplicating them.
 *
 * Run: pnpm --filter @workspace/scripts run import:exercises-dataset
 */

import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SOURCE = "gymvisual-exercises-dataset";
const DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
const RAW_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main";

// Dataset's body_part is a muscle-region taxonomy, not the movement-pattern
// enum this project's exercises.category uses. Only map the cases we can be
// confident about; leave the rest null rather than guess wrong — a coach can
// always set it by hand afterward, same as for any manually-created exercise.
const CATEGORY_MAP: Record<string, string> = {
  cardio: "cardio",
  waist: "core",
  neck: "mobilité",
};

interface DatasetEntry {
  id: string;
  name: string;
  body_part: string;
  equipment: string;
  instructions: Record<string, string>;
  muscle_group?: string;
  secondary_muscles?: string[];
  target?: string;
  image?: string;
  gif_url?: string;
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function mapEntry(entry: DatasetEntry) {
  const muscleGroups = Array.from(
    new Set([entry.target, entry.muscle_group, ...(entry.secondary_muscles ?? [])].filter((v): v is string => !!v))
  );
  const description = entry.instructions?.["fr"] ?? entry.instructions?.["en"] ?? null;

  return {
    name: capitalize(entry.name),
    category: CATEGORY_MAP[entry.body_part] ?? null,
    muscleGroups,
    equipment: entry.equipment ? [entry.equipment] : [],
    description,
    demoUrl: entry.image ? `${RAW_BASE}/${entry.image}` : null,
    demoGifUrl: entry.gif_url ? `${RAW_BASE}/${entry.gif_url}` : null,
    level: null,
    createdBy: null,
    externalSource: SOURCE,
    externalId: entry.id,
  };
}

async function importExercisesDataset(): Promise<void> {
  console.log(`Fetching dataset from ${DATASET_URL}...`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: HTTP ${res.status}`);
  }
  const dataset = (await res.json()) as DatasetEntry[];
  console.log(`Fetched ${dataset.length} exercises.`);

  const existing = await db
    .select({ id: exercisesTable.id, externalId: exercisesTable.externalId })
    .from(exercisesTable)
    .where(eq(exercisesTable.externalSource, SOURCE));
  const existingByExternalId = new Map(existing.map((e) => [e.externalId, e.id]));

  const toInsert: ReturnType<typeof mapEntry>[] = [];
  const toUpdate: { id: string; data: ReturnType<typeof mapEntry> }[] = [];

  for (const entry of dataset) {
    const mapped = mapEntry(entry);
    const existingId = existingByExternalId.get(entry.id);
    if (existingId) {
      toUpdate.push({ id: existingId, data: mapped });
    } else {
      toInsert.push(mapped);
    }
  }

  console.log(`${toInsert.length} new, ${toUpdate.length} to update.`);

  const CHUNK = 200;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    await db.insert(exercisesTable).values(chunk);
    console.log(`  Inserted ${Math.min(i + CHUNK, toInsert.length)}/${toInsert.length}`);
  }

  for (let i = 0; i < toUpdate.length; i++) {
    const u = toUpdate[i]!;
    await db.update(exercisesTable).set(u.data).where(eq(exercisesTable.id, u.id));
    if ((i + 1) % 200 === 0 || i === toUpdate.length - 1) {
      console.log(`  Updated ${i + 1}/${toUpdate.length}`);
    }
  }

  console.log(`✅ Import complete: ${toInsert.length} inserted, ${toUpdate.length} updated.`);
  console.log("   Attribution required by license: media (c) Gym Visual — https://gymvisual.com/");
}

importExercisesDataset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
