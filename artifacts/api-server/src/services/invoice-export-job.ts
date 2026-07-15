import cron from "node-cron";
import { db } from "@workspace/db";
import { studioSettingsTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getInvoicesForMonth, rowsToCsv } from "./invoicing.service.js";
import { sendAccountingExportEmail } from "./email.js";

// Same node-cron pattern as alert-job.ts/waitlist-job.ts. Fires the morning
// of the 1st of each month, exports *last* month's invoices for every coach
// who has set an accountantEmail in studio_settings.
export function startInvoiceExportJob(): void {
  cron.schedule("0 6 1 * *", async () => {
    try {
      const count = await runMonthlyAccountingExport();
      if (count > 0) logger.info({ count }, "Invoice export job: monthly CSVs sent");
    } catch (err) {
      logger.error(err, "Invoice export job failed");
    }
  });

  logger.info("Invoice export job scheduled (06:00 on the 1st of each month)");
}

export async function runMonthlyAccountingExport(): Promise<number> {
  const now = new Date();
  // Previous calendar month — this job runs on the 1st, exporting the month
  // that just closed.
  const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const year = prevMonthDate.getUTCFullYear();
  const month = prevMonthDate.getUTCMonth() + 1;

  const studios = await db
    .select({ coachId: studioSettingsTable.coachId, studioName: studioSettingsTable.studioName, accountantEmail: studioSettingsTable.accountantEmail })
    .from(studioSettingsTable)
    .where(isNotNull(studioSettingsTable.accountantEmail));

  let sent = 0;
  for (const studio of studios) {
    if (!studio.accountantEmail) continue;
    try {
      const rows = await getInvoicesForMonth(studio.coachId, year, month);
      if (rows.length === 0) continue;
      const csv = rowsToCsv(rows);
      const result = await sendAccountingExportEmail(studio.accountantEmail, studio.studioName, year, month, csv);
      if (result.ok) sent++;
      else logger.error({ coachId: studio.coachId, error: result.error }, "Invoice export job: send failed for one studio");
    } catch (err) {
      logger.error({ err, coachId: studio.coachId }, "Invoice export job: export failed for one studio");
    }
  }
  return sent;
}
