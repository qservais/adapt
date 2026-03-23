import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startAlertJob } from "./services/alert-job.js";
import { ensureAthleteInviteCodes } from "./services/invite-code-migration.js";

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

app.listen(port, async () => {
  logger.info({ port }, "Server listening");
  await ensureAthleteInviteCodes();
  startAlertJob();
});
