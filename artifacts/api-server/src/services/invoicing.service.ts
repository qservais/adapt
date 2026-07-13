import { db } from "@workspace/db";
import {
  invoiceNumberSequencesTable,
  invoicesTable,
  creditNotesTable,
  studioSettingsTable,
  usersTable,
  type Invoice,
  type CreditNote,
} from "@workspace/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { calculateInvoiceAmounts, formatInvoiceNumber, rowsToCsv, type VatRegime, type AccountingExportRow } from "../lib/invoice-math.js";
export { rowsToCsv, type AccountingExportRow } from "../lib/invoice-math.js";
import { generateInvoicePdf } from "./pdf-generator.js";
import { objectStorageClient } from "../lib/objectStorage.js";
import { logger } from "../lib/logger.js";

const BUCKET_ID = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];

// Atomic "get next number" via upsert — Postgres serializes concurrent
// ON CONFLICT DO UPDATE on the same row, so this can't produce a duplicate or
// skip a number under concurrent invoice creation without any explicit lock.
async function nextSequenceNumber(coachId: string, year: number, series: "invoice" | "credit_note"): Promise<number> {
  const [row] = await db
    .insert(invoiceNumberSequencesTable)
    .values({ coachId, year, series, lastNumber: 1 })
    .onConflictDoUpdate({
      target: [invoiceNumberSequencesTable.coachId, invoiceNumberSequencesTable.year, invoiceNumberSequencesTable.series],
      set: { lastNumber: sql`${invoiceNumberSequencesTable.lastNumber} + 1` },
    })
    .returning();
  return row!.lastNumber;
}

async function uploadPdf(objectName: string, buffer: Buffer): Promise<string | null> {
  if (!BUCKET_ID) {
    logger.warn("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set — invoice PDF generated but not persisted");
    return null;
  }
  const bucket = objectStorageClient.bucket(BUCKET_ID);
  await bucket.file(objectName).save(buffer, { contentType: "application/pdf", resumable: false });
  return objectName;
}

interface IssueInvoiceParams {
  coachId: string;
  athleteId: string;
  description: string;
  amountCentsTtc: number;
  paymentMethod: "stripe" | "credit" | "cash";
  sourceType: "shop_purchase" | "class_booking" | "one_on_one" | "subscription" | "manual";
  sourceId?: string;
}

// The one place every payment-completion point in this codebase calls to get
// a legally-compliant invoice — see the Stripe webhook (Phase 2), class/1:1
// booking confirmation (Phases 3-4), and manual "pay on site" registration
// (Phase 5) for the call sites. Never construct an invoice number anywhere
// else.
export async function issueInvoice(params: IssueInvoiceParams): Promise<Invoice> {
  const [settings] = await db.select().from(studioSettingsTable).where(eq(studioSettingsTable.coachId, params.coachId));
  const regime = (settings?.vatRegime ?? "franchise") as VatRegime;
  const prefix = settings?.invoicePrefix ?? "NH";
  const year = new Date().getFullYear();

  const amounts = calculateInvoiceAmounts(params.amountCentsTtc, regime);

  const invoice = await db.transaction(async (tx) => {
    const sequenceNumber = await nextSequenceNumber(params.coachId, year, "invoice");
    const invoiceNumber = formatInvoiceNumber(prefix, year, sequenceNumber);

    const [inserted] = await tx
      .insert(invoicesTable)
      .values({
        coachId: params.coachId,
        invoiceNumber,
        athleteId: params.athleteId,
        description: params.description,
        regime,
        vatNumber: regime === "assujetti" ? (settings?.vatNumber ?? null) : null,
        amountHtCents: amounts.amountHtCents,
        vatCents: amounts.vatCents,
        amountTtcCents: amounts.amountTtcCents,
        paymentMethod: params.paymentMethod,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        status: "issued",
      })
      .returning();
    return inserted!;
  });

  // PDF generation + upload + email happen outside the DB transaction (I/O,
  // not something that should hold a row lock) — a failure here never
  // un-issues the invoice, it just leaves pdfObjectName null for a retry.
  try {
    const [athlete] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, params.athleteId));
    const pdf = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      studioName: settings?.studioName ?? "Mouv'Up",
      studioAddress: settings?.studioAddress ?? null,
      vatNumber: invoice.vatNumber,
      regime,
      clientName: athlete ? `${athlete.firstName} ${athlete.lastName ?? ""}`.trim() : "",
      clientEmail: athlete?.email ?? "",
      line: { description: params.description, amountHtCents: amounts.amountHtCents, vatCents: amounts.vatCents, amountTtcCents: amounts.amountTtcCents },
    });
    const objectName = `invoices/${invoice.id}.pdf`;
    const saved = await uploadPdf(objectName, pdf);
    if (saved) {
      await db.update(invoicesTable).set({ pdfObjectName: saved }).where(eq(invoicesTable.id, invoice.id));
    }
  } catch (err) {
    logger.error({ err, invoiceId: invoice.id }, "issueInvoice: PDF generation/upload failed (invoice still issued)");
  }

  return invoice;
}

// Corrections are always by credit note — an issued invoice is never deleted
// or edited (per spec).
export async function issueCreditNote(invoiceId: string, reason: string): Promise<CreditNote> {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
  if (!invoice) throw new Error("Invoice not found");
  const [settings] = await db.select().from(studioSettingsTable).where(eq(studioSettingsTable.coachId, invoice.coachId));

  const year = new Date().getFullYear();
  const creditNote = await db.transaction(async (tx) => {
    const sequenceNumber = await nextSequenceNumber(invoice.coachId, year, "credit_note");
    const creditNoteNumber = formatInvoiceNumber(`${settings?.invoicePrefix ?? "NH"}-NC`, year, sequenceNumber);

    const [inserted] = await tx
      .insert(creditNotesTable)
      .values({
        invoiceId,
        creditNoteNumber,
        amountCents: invoice.amountTtcCents,
        reason,
      })
      .returning();
    await tx.update(invoicesTable).set({ status: "credited" }).where(eq(invoicesTable.id, invoiceId));
    return inserted!;
  });

  // Same rationale as issueInvoice(): PDF I/O happens outside the transaction
  // and never un-issues the credit note on failure, just leaves pdfObjectName
  // null for a retry.
  try {
    const [athlete] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, invoice.athleteId));
    const pdf = await generateInvoicePdf({
      invoiceNumber: creditNote.creditNoteNumber,
      issuedAt: creditNote.issuedAt,
      studioName: settings?.studioName ?? "Mouv'Up",
      studioAddress: settings?.studioAddress ?? null,
      vatNumber: invoice.vatNumber,
      regime: invoice.regime as VatRegime,
      clientName: athlete ? `${athlete.firstName} ${athlete.lastName ?? ""}`.trim() : "",
      clientEmail: athlete?.email ?? "",
      line: { description: invoice.description, amountHtCents: invoice.amountHtCents, vatCents: invoice.vatCents, amountTtcCents: invoice.amountTtcCents },
      isCreditNote: true,
      creditNoteReason: reason,
    });
    const objectName = `credit-notes/${creditNote.id}.pdf`;
    const saved = await uploadPdf(objectName, pdf);
    if (saved) {
      await db.update(creditNotesTable).set({ pdfObjectName: saved }).where(eq(creditNotesTable.id, creditNote.id));
      creditNote.pdfObjectName = saved;
    }
  } catch (err) {
    logger.error({ err, creditNoteId: creditNote.id }, "issueCreditNote: PDF generation/upload failed (credit note still issued)");
  }

  return creditNote;
}

export async function getInvoicesForMonth(coachId: string, year: number, month: number): Promise<AccountingExportRow[]> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const rows = await db
    .select({
      issuedAt: invoicesTable.issuedAt,
      invoiceNumber: invoicesTable.invoiceNumber,
      description: invoicesTable.description,
      amountTtcCents: invoicesTable.amountTtcCents,
      paymentMethod: invoicesTable.paymentMethod,
      regime: invoicesTable.regime,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(invoicesTable)
    .innerJoin(usersTable, eq(invoicesTable.athleteId, usersTable.id))
    .where(and(eq(invoicesTable.coachId, coachId), gte(invoicesTable.issuedAt, monthStart), lte(invoicesTable.issuedAt, monthEnd)));

  return rows.map((r) => ({
    date: r.issuedAt.toISOString().slice(0, 10),
    invoiceNumber: r.invoiceNumber,
    client: `${r.firstName} ${r.lastName ?? ""}`.trim(),
    product: r.description,
    amountCents: r.amountTtcCents,
    paymentMethod: r.paymentMethod,
    regime: r.regime,
  }));
}

