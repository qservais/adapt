import PDFDocument from "pdfkit";

// Deliberately not added to build.ts's esbuild bundle allowlist: pdfkit reads
// its font metrics (.afm) files from disk by relative path at runtime, which
// bundling would very likely break. Left as an external (the esbuild config's
// default for anything not explicitly allow-listed), loaded normally from
// node_modules — same reasoning as why puppeteer was ruled out in favor of
// pdfkit in the first place (see the Phase 6 commit message).

interface InvoiceLine {
  description: string;
  amountHtCents: number;
  vatCents: number;
  amountTtcCents: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: Date;
  studioName: string;
  studioAddress: string | null;
  vatNumber: string | null;
  regime: "franchise" | "assujetti";
  clientName: string;
  clientEmail: string;
  line: InvoiceLine;
  isCreditNote?: boolean;
  creditNoteReason?: string;
}

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}

export function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const title = data.isCreditNote ? "NOTE DE CRÉDIT" : "NOTE D'HONORAIRES";

    doc.fontSize(20).text(title, { align: "right" });
    doc.fontSize(10).text(data.invoiceNumber, { align: "right" });
    doc.text(data.issuedAt.toLocaleDateString("fr-BE"), { align: "right" });
    doc.moveDown(2);

    doc.fontSize(12).text(data.studioName);
    if (data.studioAddress) doc.fontSize(10).text(data.studioAddress);
    if (data.regime === "assujetti" && data.vatNumber) doc.fontSize(10).text(`TVA : ${data.vatNumber}`);
    doc.moveDown();

    doc.fontSize(10).text("Client :");
    doc.text(data.clientName);
    doc.text(data.clientEmail);
    doc.moveDown(2);

    if (data.isCreditNote && data.creditNoteReason) {
      doc.fontSize(10).text(`Motif : ${data.creditNoteReason}`);
      doc.moveDown();
    }

    const tableTop = doc.y;
    doc.fontSize(10).text("Description", 50, tableTop);
    if (data.regime === "assujetti") {
      doc.text("Montant HT", 300, tableTop);
      doc.text("TVA (21%)", 380, tableTop);
      doc.text("Montant TTC", 460, tableTop);
    } else {
      doc.text("Montant", 460, tableTop);
    }
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    const rowY = tableTop + 25;
    doc.text(data.line.description, 50, rowY);
    if (data.regime === "assujetti") {
      doc.text(formatEuros(data.line.amountHtCents), 300, rowY);
      doc.text(formatEuros(data.line.vatCents), 380, rowY);
      doc.text(formatEuros(data.line.amountTtcCents), 460, rowY);
    } else {
      doc.text(formatEuros(data.line.amountTtcCents), 460, rowY);
    }

    doc.moveDown(3);
    doc.fontSize(12).text(`Total : ${formatEuros(data.line.amountTtcCents)}`, { align: "right" });

    doc.moveDown(3);
    if (data.regime === "franchise") {
      doc.fontSize(9).fillColor("#555").text("TVA non applicable — Régime de la franchise, art. 56bis du Code de la TVA.");
    }

    doc.end();
  });
}
