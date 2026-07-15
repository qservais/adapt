/**
 * Unit tests: invoice VAT calculation + numbering + CSV formatting.
 * Run: pnpm --filter @workspace/api-server exec tsx tests/invoicing.test.ts
 *
 * No database needed — src/lib/invoice-math.ts has zero imports, same
 * pattern as ledger-math.ts and cancellation-math.ts.
 */

import { calculateInvoiceAmounts, formatInvoiceNumber, rowsToCsv, type AccountingExportRow } from "../src/lib/invoice-math.js";

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  function assertEqual<T>(actual: T, expected: T, label: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  console.log("\nInvoicing Unit Tests\n");

  test("calculateInvoiceAmounts: franchise regime has no VAT line, HT = TTC", () => {
    const result = calculateInvoiceAmounts(15000, "franchise");
    assertEqual(result, { amountHtCents: 15000, vatCents: 0, amountTtcCents: 15000 }, "franchise");
  });

  test("calculateInvoiceAmounts: assujetti backs out 21% VAT from the TTC price the member actually paid", () => {
    // 120€ TTC → HT ≈ 99.17€, VAT ≈ 20.83€ — the member never pays more than
    // the sticker price just because the regime flips.
    const result = calculateInvoiceAmounts(12000, "assujetti");
    assertEqual(result.amountTtcCents, 12000, "TTC unchanged");
    assertEqual(result.amountHtCents + result.vatCents, 12000, "HT + VAT reconstructs TTC exactly (rounding-safe)");
    if (result.amountHtCents <= 0) throw new Error("HT should be positive");
  });

  test("calculateInvoiceAmounts: HT + VAT always reconstructs TTC exactly, even on awkward cents", () => {
    for (const cents of [1, 7, 99, 101, 999, 12345, 999999]) {
      const result = calculateInvoiceAmounts(cents, "assujetti");
      if (result.amountHtCents + result.vatCents !== cents) {
        throw new Error(`rounding drift at ${cents}c: HT ${result.amountHtCents} + VAT ${result.vatCents} != TTC ${cents}`);
      }
    }
  });

  test("formatInvoiceNumber: matches the client's exact example format", () => {
    assertEqual(formatInvoiceNumber("NH", 2026, 1), "NH-2026-0001", "first invoice of the year");
    assertEqual(formatInvoiceNumber("NH", 2026, 142), "NH-2026-0142", "three-digit sequence stays zero-padded to 4");
    assertEqual(formatInvoiceNumber("NH", 2026, 12345), "NH-2026-12345", "sequence past 4 digits is never truncated");
  });

  test("rowsToCsv: quotes fields containing commas (client/product names)", () => {
    const rows: AccountingExportRow[] = [
      { date: "2026-07-01", invoiceNumber: "NH-2026-0001", client: "Dubois, Marie", product: "Pack 10", amountCents: 15000, paymentMethod: "stripe", regime: "franchise" },
    ];
    const csv = rowsToCsv(rows);
    if (!csv.includes('"Dubois, Marie"')) throw new Error("expected comma-containing client name to be quoted");
  });

  test("rowsToCsv: formats amounts as decimal euros, not raw cents", () => {
    const rows: AccountingExportRow[] = [
      { date: "2026-07-01", invoiceNumber: "NH-2026-0001", client: "Marie D.", product: "Séance 1:1", amountCents: 6500, paymentMethod: "credit", regime: "franchise" },
    ];
    const csv = rowsToCsv(rows);
    if (!csv.includes("65.00")) throw new Error(`expected "65.00" in CSV output, got: ${csv}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
