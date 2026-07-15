// Pure functions, no imports — see tests/invoicing.test.ts.

export type VatRegime = "franchise" | "assujetti";

export interface InvoiceAmounts {
  amountHtCents: number;
  vatCents: number;
  amountTtcCents: number;
}

const VAT_RATE = 0.21;

// The price charged is always what the member actually pays (TTC) — the
// regime only changes how that same price is *broken down* on the invoice,
// never what the member is charged. In franchise mode there's no VAT line at
// all (HT = TTC). In assujetti mode, HT is back-calculated from the TTC price
// members already saw in the shop, not added on top of it.
export function calculateInvoiceAmounts(priceCentsTtc: number, regime: VatRegime): InvoiceAmounts {
  if (regime === "franchise") {
    return { amountHtCents: priceCentsTtc, vatCents: 0, amountTtcCents: priceCentsTtc };
  }
  const amountHtCents = Math.round(priceCentsTtc / (1 + VAT_RATE));
  const vatCents = priceCentsTtc - amountHtCents;
  return { amountHtCents, vatCents, amountTtcCents: priceCentsTtc };
}

// "NH-2026-0001" — prefix from studio_settings, 4-digit sequence, zero-padded.
// Never call this with a number you haven't just gotten back from the
// invoice_number_sequences upsert — see invoicing.service.ts.
export function formatInvoiceNumber(prefix: string, year: number, sequenceNumber: number): string {
  return `${prefix}-${year}-${String(sequenceNumber).padStart(4, "0")}`;
}

export interface AccountingExportRow {
  date: string;
  invoiceNumber: string;
  client: string;
  product: string;
  amountCents: number;
  paymentMethod: string;
  regime: string;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function rowsToCsv(rows: AccountingExportRow[]): string {
  const header = ["Date", "N° note", "Client", "Produit", "Montant (EUR)", "Moyen de paiement", "Régime"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.date, r.invoiceNumber, csvEscape(r.client), csvEscape(r.product), (r.amountCents / 100).toFixed(2), r.paymentMethod, r.regime].join(","),
    );
  }
  return lines.join("\n");
}
