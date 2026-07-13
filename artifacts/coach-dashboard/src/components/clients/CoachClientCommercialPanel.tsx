import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetClientCredits,
  useGiftCredits,
  useGetCoachAppointments,
  useGetCoachInvoices,
} from "@workspace/api-client-react";
import { Gift, Loader2, CreditCard, CalendarClock, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

const APPOINTMENT_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  declined: "destructive",
  cancelled: "secondary",
};

const REASON_LABELS: Record<string, string> = {
  purchase: "Achat",
  gift: "Offert",
  booking: "Réservation",
  cancellation_refund: "Remboursement (annulation)",
  waitlist_confirm: "Confirmation liste d'attente",
  manual_adjustment: "Ajustement manuel",
};

interface Props {
  athleteId: string;
}

export function CoachClientCommercialPanel({ athleteId }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const creditsQuery = useGetClientCredits(athleteId, { query: { queryKey: [`/api/coach/clients/${athleteId}/credits`] } });
  const appointmentsQuery = useGetCoachAppointments({ query: { queryKey: ["/api/coach/appointments"] } });
  const invoicesQuery = useGetCoachInvoices({ query: { queryKey: ["/api/coach/invoices"] } });
  const giftMutation = useGiftCredits();

  const [giftOpen, setGiftOpen] = useState(false);
  const [giftType, setGiftType] = useState<"collectif" | "individuel">("collectif");
  const [giftQty, setGiftQty] = useState("1");
  const [giftMessage, setGiftMessage] = useState("");

  const handleGift = async () => {
    const quantity = parseInt(giftQty, 10);
    if (!quantity || quantity < 1) return;
    try {
      await giftMutation.mutateAsync({
        data: { athleteIds: [athleteId], creditType: giftType, quantity, message: giftMessage.trim() || undefined },
      });
      creditsQuery.refetch();
      setGiftOpen(false);
      setGiftQty("1");
      setGiftMessage("");
      toast({ title: "Crédits offerts" });
    } catch {
      toast({ title: "Échec de l'offre de crédits", variant: "destructive" });
    }
  };

  const appointments = (appointmentsQuery.data ?? [])
    .filter((a) => a.athleteId === athleteId)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const invoices = (invoicesQuery.data ?? [])
    .filter((inv) => inv.athleteId === athleteId)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const balances = creditsQuery.data?.balances;
  const transactions = creditsQuery.data?.transactions ?? [];

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-mono text-muted-foreground tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> CRÉDITS
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setGiftOpen((v) => !v)}>
            <Gift className="w-3.5 h-3.5" /> Offrir des crédits
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {creditsQuery.isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex gap-4">
              <div className="flex-1 bg-background border border-border rounded-lg p-3">
                <p className="text-2xl font-mono font-bold text-white">{balances?.collectif ?? 0}</p>
                <p className="text-xs text-muted-foreground">Crédits cours collectifs</p>
              </div>
              <div className="flex-1 bg-background border border-border rounded-lg p-3">
                <p className="text-2xl font-mono font-bold text-white">{balances?.individuel ?? 0}</p>
                <p className="text-xs text-muted-foreground">Crédits 1:1</p>
              </div>
            </div>
          )}

          {giftOpen && (
            <div className="flex items-end gap-2 border-t border-border pt-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={giftType} onValueChange={(v) => setGiftType(v as "collectif" | "individuel")}>
                  <SelectTrigger className="w-36 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collectif">Collectif</SelectItem>
                    <SelectItem value="individuel">1:1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantité</Label>
                <Input
                  type="number"
                  min={1}
                  value={giftQty}
                  onChange={(e) => setGiftQty(e.target.value)}
                  className="w-20 bg-background border-border"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Message (optionnel)</Label>
                <Input
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <Button onClick={handleGift} disabled={giftMutation.isPending} className="bg-primary text-black hover:bg-primary/90">
                {giftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Offrir"}
              </Button>
            </div>
          )}

          {transactions.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              {transactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {REASON_LABELS[tx.reason] ?? tx.reason} · {tx.creditType === "collectif" ? "Collectif" : "1:1"}
                    {tx.createdAt && ` · ${format(new Date(tx.createdAt), "d MMM yyyy", { locale: fr })}`}
                  </span>
                  <span className={`font-mono font-bold ${tx.delta > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                    {tx.delta > 0 ? "+" : ""}{tx.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-muted-foreground tracking-wider flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-violet-400" /> RENDEZ-VOUS 1:1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {appointmentsQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {!appointmentsQuery.isLoading && appointments.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous 1:1.</p>
          )}
          {appointments.slice(0, 10).map((a) => {
            const status = a.status ?? "pending";
            return (
              <div key={a.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-white">{format(new Date(a.startAt), "d MMM yyyy, HH:mm", { locale: fr })}</p>
                  <p className="text-xs text-muted-foreground">{a.durationMin} min{a.location ? ` · ${a.location}` : ""}</p>
                </div>
                <Badge variant={APPOINTMENT_STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-muted-foreground tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" /> FACTURES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoicesQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {!invoicesQuery.isLoading && invoices.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune facture.</p>
          )}
          {invoices.slice(0, 10).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm text-white font-mono">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(inv.issuedAt), "d MMM yyyy", { locale: fr })} · {inv.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-white">{formatEuros(inv.amountTtcCents)}</p>
                {inv.status === "credited" && <Badge variant="destructive" className="mt-0.5">Annulée</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
