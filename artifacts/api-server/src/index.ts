import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startAlertJob } from "./services/alert-job.js";
import { startNotificationJob } from "./services/notification-job.js";
import { startWaitlistJob } from "./services/waitlist-job.js";
import { ensureAthleteInviteCodes } from "./services/invite-code-migration.js";
import { fixProdData, runSchemaMigrations } from "./services/fix-prod-data.js";
import { runBlockMigration } from "./services/block-migration.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await runSchemaMigrations();
  await fixProdData();
  await ensureAthleteInviteCodes();
  await runBlockMigration();

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
    startAlertJob();
    startNotificationJob();
    startWaitlistJob();
  });
}

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
