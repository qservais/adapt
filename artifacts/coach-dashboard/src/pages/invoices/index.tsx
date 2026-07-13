import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  useGetCoachInvoices,
  useCreateInvoiceCreditNote,
  useGetCoachCreditNotes,
  exportCoachInvoicesCsv,
  getInvoicePdf,
} from "@workspace/api-client-react";
import type { InvoiceListItem } from "@workspace/api-client-react";
import { Receipt, Download, Loader2, FileMinus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function euros(cents: number): string {
  return (cents / 100).toFixed(2);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function triggerDownload(blobOrText: Blob | string, filename: string, mime: string) {
  const blob = typeof blobOrText === "string" ? new Blob([blobOrText], { type: mime }) : blobOrText;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: invoices, isLoading, refetch: refetchInvoices } = useGetCoachInvoices({ query: { queryKey: ["/api/coach/invoices"] } });
  const { data: creditNotes, refetch: refetchCreditNotes } = useGetCoachCreditNotes({ query: { queryKey: ["/api/coach/credit-notes"] } });
  const creditNoteMutation = useCreateInvoiceCreditNote();

  const now = new Date();
  const [exportYear, setExportYear] = useState(String(now.getFullYear()));
  const [exportMonth, setExportMonth] = useState(String(now.getMonth() + 1));
  const [exporting, setExporting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [creditNoteDialog, setCreditNoteDialog] = useState<{ open: boolean; invoice?: InvoiceListItem }>({ open: false });
  const [creditNoteReason, setCreditNoteReason] = useState("");

  async function handleExportCsv() {
    setExporting(true);
    try {
      const csv = await exportCoachInvoicesCsv({ year: parseInt(exportYear, 10), month: parseInt(exportMonth, 10) });
      triggerDownload(csv, `factures-${exportYear}-${exportMonth.padStart(2, "0")}.csv`, "text/csv");
    } catch {
      toast({ title: t("invoices_page.export_failed", { defaultValue: "Échec de l'export" }), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadPdf(invoice: InvoiceListItem) {
    setDownloadingId(invoice.id);
    try {
      const blob = await getInvoicePdf(invoice.id);
      triggerDownload(blob, `${invoice.invoiceNumber}.pdf`, "application/pdf");
    } catch {
      toast({ title: t("invoices_page.download_failed", { defaultValue: "Échec du téléchargement" }), variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleCreateCreditNote() {
    if (!creditNoteDialog.invoice || !creditNoteReason.trim()) {
      toast({ title: t("invoices_page.reason_required", { defaultValue: "Motif requis" }), variant: "destructive" });
      return;
    }
    try {
      await creditNoteMutation.mutateAsync({ id: creditNoteDialog.invoice.id, data: { reason: creditNoteReason.trim() } });
      toast({ title: t("invoices_page.credit_note_issued", { defaultValue: "Note de crédit émise" }) });
      setCreditNoteDialog({ open: false });
      setCreditNoteReason("");
      refetchInvoices();
      refetchCreditNotes();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      toast({
        title: status === 409
          ? t("invoices_page.already_credited", { defaultValue: "Cette facture a déjà une note de crédit" })
          : t("invoices_page.action_failed", { defaultValue: "Échec de l'opération" }),
        variant: "destructive",
      });
    }
  }

  const list = invoices ?? [];
  const notes = creditNotes ?? [];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" /> {t("invoices_page.title", { defaultValue: "FACTURES" })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("invoices_page.subtitle", { defaultValue: "Historique de facturation et export comptable." })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={exportMonth} onValueChange={setExportMonth}>
            <SelectTrigger className="w-32 bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={exportYear} onValueChange={setExportYear}>
            <SelectTrigger className="w-24 bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportCsv} disabled={exporting} className="gap-2 bg-primary text-black hover:bg-primary/90 font-bold">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t("invoices_page.export_csv", { defaultValue: "Export CSV" })}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {!isLoading && list.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">{t("invoices_page.no_invoices", { defaultValue: "Aucune facture émise." })}</p>
          </div>
        )}
        {list.map((inv) => (
          <div key={inv.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-white">{inv.invoiceNumber}</span>
                <Badge variant={inv.regime === "assujetti" ? "default" : "outline"} className="text-[10px]">
                  {inv.regime === "assujetti" ? "TVA 21%" : "Franchise"}
                </Badge>
                {inv.status === "credited" && <Badge variant="destructive" className="text-[10px]">{t("invoices_page.credited", { defaultValue: "Annulée" })}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {[inv.athleteFirstName, inv.athleteLastName].filter(Boolean).join(" ")} · {inv.description}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{fmtDate(inv.issuedAt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-mono font-bold text-white">{euros(inv.amountTtcCents)} €</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(inv)} disabled={downloadingId === inv.id} title={t("invoices_page.download_pdf", { defaultValue: "Télécharger le PDF" }) as string}>
                {downloadingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              </Button>
              {inv.status !== "credited" && (
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCreditNoteDialog({ open: true, invoice: inv })} title={t("invoices_page.issue_credit_note", { defaultValue: "Émettre une note de crédit" }) as string}>
                  <FileMinus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {notes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-display text-white">{t("invoices_page.credit_notes_title", { defaultValue: "Notes de crédit" })}</h2>
          {notes.map((note) => (
            <div key={note.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm text-white">{note.creditNoteNumber}</span>
                <p className="text-sm text-muted-foreground mt-1">{note.reason}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{fmtDate(note.issuedAt)}</p>
              </div>
              <p className="text-lg font-mono font-bold text-destructive">-{euros(note.amountCents)} €</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={creditNoteDialog.open} onOpenChange={(o) => setCreditNoteDialog({ open: o })}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("invoices_page.dialog_credit_note", { defaultValue: "Émettre une note de crédit" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {creditNoteDialog.invoice?.invoiceNumber} — {creditNoteDialog.invoice ? euros(creditNoteDialog.invoice.amountTtcCents) : ""} €
            </p>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("invoices_page.field_reason", { defaultValue: "Motif" })}</Label>
              <Input value={creditNoteReason} onChange={(e) => setCreditNoteReason(e.target.value)} placeholder={t("invoices_page.reason_placeholder", { defaultValue: "Erreur de facturation, remboursement..." }) as string} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditNoteDialog({ open: false })}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button variant="destructive" onClick={handleCreateCreditNote} disabled={creditNoteMutation.isPending}>
              {creditNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("invoices_page.issue", { defaultValue: "Émettre" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
