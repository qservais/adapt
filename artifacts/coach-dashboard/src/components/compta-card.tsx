import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  useGetStudioSettings,
  useUpdateStudioSettings,
  useGetCoachInvoices,
  exportCoachInvoicesCsv,
} from "@workspace/api-client-react";
import { Landmark, Loader2, Save, Receipt, Download, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type VatRegime = "franchise" | "assujetti";

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

/**
 * "ComptaCard" from the client-validated mockup — lives inside /profile.
 * VAT regime toggle + invoice history + CSV export, all wired to the
 * already-working PUT/GET /api/studio-settings endpoint (backend untouched).
 */
export function ComptaCard() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useGetStudioSettings({
    query: { queryKey: ["/api/studio-settings"] },
  });
  const updateMutation = useUpdateStudioSettings();

  const [regime, setRegime] = useState<VatRegime>("franchise");
  const [vatNumber, setVatNumber] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setRegime((settings.vatRegime as VatRegime) ?? "franchise");
    setVatNumber(settings.vatNumber ?? "");
    setDirty(false);
  }, [settings]);

  async function handleSave() {
    if (regime === "assujetti" && !vatNumber.trim()) {
      toast({
        title: t("profile_page.compta.vat_number_required", { defaultValue: "Le numéro de TVA est requis en régime assujetti." }),
        variant: "destructive",
      });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        data: {
          vatRegime: regime,
          vatNumber: regime === "assujetti" ? vatNumber.trim() : null,
        },
      });
      setDirty(false);
      toast({ title: t("profile_page.compta.save_success", { defaultValue: "Régime de TVA mis à jour" }) });
    } catch {
      toast({ title: t("profile_page.compta.save_error", { defaultValue: "Échec de l'enregistrement" }), variant: "destructive" });
    }
  }

  // ─── Invoice history (recent) + CSV export ─────────────────────────────
  const { data: invoices, isLoading: invoicesLoading } = useGetCoachInvoices({
    query: { queryKey: ["/api/coach/invoices"] },
  });
  const recentInvoices = (invoices ?? []).slice(0, 5);

  const now = new Date();
  const [exportYear, setExportYear] = useState(String(now.getFullYear()));
  const [exportMonth, setExportMonth] = useState(String(now.getMonth() + 1));
  const [exporting, setExporting] = useState(false);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const csv = await exportCoachInvoicesCsv({ year: parseInt(exportYear, 10), month: parseInt(exportMonth, 10) });
      triggerDownload(csv, `factures-${exportYear}-${exportMonth.padStart(2, "0")}.csv`, "text/csv");
    } catch {
      toast({ title: t("profile_page.compta.export_failed", { defaultValue: "Échec de l'export" }), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Landmark className="w-4 h-4" /> {t("profile_page.compta.section", { defaultValue: "Comptabilité & facturation" })}
      </h2>

      {settingsLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
              {t("profile_page.compta.regime_label", { defaultValue: "Régime de TVA" })}
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              {(["franchise", "assujetti"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRegime(r); setDirty(true); }}
                  className={`flex-1 text-left px-4 py-3 rounded-lg border transition-colors ${
                    regime === r
                      ? "bg-primary text-black border-primary font-bold"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-sm">
                    {r === "franchise"
                      ? t("profile_page.compta.regime_franchise", { defaultValue: "Franchise (art. 56bis)" })
                      : t("profile_page.compta.regime_assujetti", { defaultValue: "Assujetti TVA 21%" })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {regime === "assujetti" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                {t("profile_page.compta.vat_number_label", { defaultValue: "Numéro de TVA" })}
              </Label>
              <Input
                value={vatNumber}
                onChange={(e) => { setVatNumber(e.target.value); setDirty(true); }}
                placeholder="BE 0123.456.789"
                className="bg-background border-border text-white"
              />
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/50 border border-border rounded-lg p-3">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <p>
              {t("profile_page.compta.retroactive_note", {
                defaultValue: "Ce changement s'applique uniquement aux prochaines factures. Les factures déjà émises ne sont jamais modifiées rétroactivement.",
              })}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!dirty || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {t("profile_page.compta.save", { defaultValue: "Enregistrer" })}
            </Button>
          </div>
        </>
      )}

      <div className="border-t border-border pt-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4" /> {t("profile_page.compta.history_section", { defaultValue: "Historique des factures" })}
          </h3>
          <div className="flex items-center gap-2">
            <Select value={exportMonth} onValueChange={setExportMonth}>
              <SelectTrigger className="w-28 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_LABELS.map((label, idx) => (
                  <SelectItem key={idx} value={String(idx + 1)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exportYear} onValueChange={setExportYear}>
              <SelectTrigger className="w-20 h-8 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleExportCsv} disabled={exporting} className="gap-1.5 bg-primary text-black hover:bg-primary/90 font-bold h-8 text-xs">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t("profile_page.compta.export_csv", { defaultValue: "Export CSV" })}
            </Button>
          </div>
        </div>

        {invoicesLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {!invoicesLoading && recentInvoices.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("profile_page.compta.no_invoices", { defaultValue: "Aucune facture émise." })}</p>
        )}
        <div className="space-y-2">
          {recentInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-white">{inv.invoiceNumber}</span>
                  <Badge variant={inv.regime === "assujetti" ? "default" : "outline"} className="text-[9px]">
                    {inv.regime === "assujetti" ? "TVA 21%" : "Franchise"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[inv.athleteFirstName, inv.athleteLastName].filter(Boolean).join(" ")} · {fmtDate(inv.issuedAt)}
                </p>
              </div>
              <span className="text-sm font-mono font-bold text-white shrink-0">{euros(inv.amountTtcCents)} €</span>
            </div>
          ))}
        </div>

        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          {t("profile_page.compta.see_all", { defaultValue: "Voir toutes les factures et notes de crédit" })} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
