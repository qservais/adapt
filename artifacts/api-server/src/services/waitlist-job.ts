import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { expireStaleWaitlistOffers } from "./booking.service.js";

// Same pattern as alert-job.ts/notification-job.ts, just a much shorter
// interval — a 30-minute confirm window needs checking far more often than
// once a day. Every 2 minutes bounds the worst-case delay in promoting the
// next person in line to ~2 minutes, which is fine against a 30-minute offer.
export function startWaitlistJob(): void {
  cron.schedule("*/2 * * * *", async () => {
    try {
      const count = await expireStaleWaitlistOffers();
      if (count > 0) logger.info({ count }, "Waitlist job: expired offers processed");
    } catch (err) {
      logger.error(err, "Waitlist job failed");
    }
  });

  logger.info("Waitlist job scheduled (every 2 minutes)");
}
