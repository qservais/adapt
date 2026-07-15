import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, creditNotesTable, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { issueCreditNote, getInvoicesForMonth } from "../services/invoicing.service.js";
import { rowsToCsv } from "../lib/invoice-math.js";
import { objectStorageClient } from "../lib/objectStorage.js";
import { logger } from "../lib/logger.js";

const router = Router();
const BUCKET_ID = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];

router.get("/coach/invoices", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const rows = await db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        athleteId: invoicesTable.athleteId,
        description: invoicesTable.description,
        regime: invoicesTable.regime,
        amountHtCents: invoicesTable.amountHtCents,
        vatCents: invoicesTable.vatCents,
        amountTtcCents: invoicesTable.amountTtcCents,
        paymentMethod: invoicesTable.paymentMethod,
        status: invoicesTable.status,
        issuedAt: invoicesTable.issuedAt,
        athleteFirstName: usersTable.firstName,
        athleteLastName: usersTable.lastName,
      })
      .from(invoicesTable)
      .innerJoin(usersTable, eq(invoicesTable.athleteId, usersTable.id))
      .where(eq(invoicesTable.coachId, req.user!.userId))
      .orderBy(desc(invoicesTable.issuedAt))
      .limit(200);
    res.json(rows.map((r) => ({ ...r, issuedAt: r.issuedAt.toISOString() })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const creditNoteSchema = z.object({
  reason: z.string().min(1).max(500),
});

router.post("/coach/invoices/:id/credit-note", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = creditNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [invoice] = await db.select({ id: invoicesTable.id, status: invoicesTable.status }).from(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.coachId, coachId)));
    if (!invoice) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Note introuvable" } });
      return;
    }
    if (invoice.status === "credited") {
      res.status(409).json({ error: { code: "ALREADY_CREDITED", message: "Cette note a déjà été créditée" } });
      return;
    }
    await issueCreditNote(id, parsed.data.reason);
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/invoices/export.csv", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const now = new Date();
    const year = req.query["year"] ? parseInt(String(req.query["year"])) : now.getFullYear();
    const month = req.query["month"] ? parseInt(String(req.query["month"])) : now.getMonth() + 1;
    const rows = await getInvoicesForMonth(req.user!.userId, year, month);
    const csv = rowsToCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="export-${year}-${String(month).padStart(2, "0")}.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// Streams the PDF rather than exposing a raw storage URL — only the coach who
// issued it, or the athlete it was issued to, may download it (it's a
// financial document with personal data). The :id may be either an invoice
// id or a credit note id — credit notes have no athleteId/coachId of their
// own, so authorization always resolves through the parent invoice.
router.get("/invoices/:id/pdf", authenticate, async (req, res) => {
  try {
    const id = String(req.params["id"]);

    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    let pdfObjectName: string | null;
    let documentNumber: string;
    let coachId: string;
    let athleteId: string;

    if (invoice) {
      pdfObjectName = invoice.pdfObjectName;
      documentNumber = invoice.invoiceNumber;
      coachId = invoice.coachId;
      athleteId = invoice.athleteId;
    } else {
      const [creditNote] = await db
        .select({ pdfObjectName: creditNotesTable.pdfObjectName, creditNoteNumber: creditNotesTable.creditNoteNumber, coachId: invoicesTable.coachId, athleteId: invoicesTable.athleteId })
        .from(creditNotesTable)
        .innerJoin(invoicesTable, eq(creditNotesTable.invoiceId, invoicesTable.id))
        .where(eq(creditNotesTable.id, id));
      if (!creditNote) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Note introuvable" } });
        return;
      }
      pdfObjectName = creditNote.pdfObjectName;
      documentNumber = creditNote.creditNoteNumber;
      coachId = creditNote.coachId;
      athleteId = creditNote.athleteId;
    }

    const isOwner = athleteId === req.user!.userId;
    const isIssuingCoach = coachId === req.user!.userId && req.user!.role === "coach";
    if (!isOwner && !isIssuingCoach) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
      return;
    }
    if (!pdfObjectName || !BUCKET_ID) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF non disponible" } });
      return;
    }
    const file = objectStorageClient.bucket(BUCKET_ID).file(pdfObjectName);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF non disponible" } });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${documentNumber}.pdf"`);
    file.createReadStream().on("error", (err) => {
      logger.error({ err, id }, "GET /invoices/:id/pdf: stream error");
      if (!res.headersSent) res.status(500).end();
    }).pipe(res);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/credit-notes", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const rows = await db
      .select({ id: creditNotesTable.id, creditNoteNumber: creditNotesTable.creditNoteNumber, amountCents: creditNotesTable.amountCents, reason: creditNotesTable.reason, issuedAt: creditNotesTable.issuedAt, invoiceId: creditNotesTable.invoiceId })
      .from(creditNotesTable)
      .innerJoin(invoicesTable, eq(creditNotesTable.invoiceId, invoicesTable.id))
      .where(eq(invoicesTable.coachId, req.user!.userId))
      .orderBy(desc(creditNotesTable.issuedAt));
    res.json(rows.map((r) => ({ ...r, issuedAt: r.issuedAt.toISOString() })));
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
