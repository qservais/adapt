import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  useGetCoachShopPacks,
  useCreateShopPack,
  useUpdateShopPack,
  useDeleteShopPack,
  useCreateShopPromo,
  useEndShopPromo,
  useGetCoachShopSubscriptions,
  useUpdateSubscriptionPlan,
} from "@workspace/api-client-react";
import type { CoachShopPack, SubscriptionPlan } from "@workspace/api-client-react";
import {
  ShoppingBag, Plus, Pencil, Trash2, Loader2, Tag, Percent, X, CreditCard, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function euros(cents: number): string {
  return (cents / 100).toFixed(2);
}
function toCents(euroStr: string): number {
  return Math.round(parseFloat(euroStr || "0") * 100);
}

type PackForm = {
  creditType: "collectif" | "individuel";
  name: string;
  credits: string;
  priceEuros: string;
  validityMonths: string;
  tag: string;
};
const emptyPackForm: PackForm = { creditType: "collectif", name: "", credits: "1", priceEuros: "0", validityMonths: "", tag: "" };

export default function ShopPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"packs" | "subscriptions">("packs");

  const { data: packs, isLoading: packsLoading, refetch: refetchPacks } = useGetCoachShopPacks({
    query: { queryKey: ["/api/coach/shop/packs"] },
  });
  const { data: subs, isLoading: subsLoading, refetch: refetchSubs } = useGetCoachShopSubscriptions({
    query: { queryKey: ["/api/coach/shop/subscriptions"] },
  });

  const createPackMutation = useCreateShopPack();
  const updatePackMutation = useUpdateShopPack();
  const deletePackMutation = useDeleteShopPack();
  const createPromoMutation = useCreateShopPromo();
  const endPromoMutation = useEndShopPromo();
  const updateSubMutation = useUpdateSubscriptionPlan();

  const [packDialog, setPackDialog] = useState<{ open: boolean; pack?: CoachShopPack }>({ open: false });
  const [packForm, setPackForm] = useState<PackForm>(emptyPackForm);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [promoDialog, setPromoDialog] = useState<{ open: boolean; pack?: CoachShopPack }>({ open: false });
  const [promoPrice, setPromoPrice] = useState("0");
  const [promoDays, setPromoDays] = useState("7");
  const [endingPromoId, setEndingPromoId] = useState<string | null>(null);

  const [subDialog, setSubDialog] = useState<{ open: boolean; sub?: SubscriptionPlan }>({ open: false });
  const [subPrice, setSubPrice] = useState("0");
  const [subEngagement, setSubEngagement] = useState("");

  function openNewPack() {
    setPackForm(emptyPackForm);
    setPackDialog({ open: true });
  }
  function openEditPack(pack: CoachShopPack) {
    setPackForm({
      creditType: pack.creditType as "collectif" | "individuel",
      name: pack.name,
      credits: String(pack.credits),
      priceEuros: euros(pack.priceCents),
      validityMonths: pack.validityMonths != null ? String(pack.validityMonths) : "",
      tag: pack.tag ?? "",
    });
    setPackDialog({ open: true, pack });
  }

  async function handleSavePack() {
    if (!packForm.name.trim()) {
      toast({ title: t("shop_page.name_required", { defaultValue: "Nom requis" }), variant: "destructive" });
      return;
    }
    const data = {
      creditType: packForm.creditType,
      name: packForm.name.trim(),
      credits: parseInt(packForm.credits, 10) || 1,
      priceCents: toCents(packForm.priceEuros),
      validityMonths: packForm.validityMonths ? parseInt(packForm.validityMonths, 10) : null,
      tag: packForm.tag.trim() || null,
    };
    try {
      if (packDialog.pack) {
        await updatePackMutation.mutateAsync({ id: packDialog.pack.id, data });
        toast({ title: t("shop_page.pack_updated", { defaultValue: "Pack mis à jour" }) });
      } else {
        await createPackMutation.mutateAsync({ data });
        toast({ title: t("shop_page.pack_created", { defaultValue: "Pack créé" }) });
      }
      setPackDialog({ open: false });
      refetchPacks();
    } catch {
      toast({ title: t("shop_page.save_failed", { defaultValue: "Échec de l'enregistrement" }), variant: "destructive" });
    }
  }

  async function handleDeactivatePack() {
    if (!deactivateId) return;
    try {
      await deletePackMutation.mutateAsync({ id: deactivateId });
      toast({ title: t("shop_page.pack_deactivated", { defaultValue: "Pack désactivé" }) });
      setDeactivateId(null);
      refetchPacks();
    } catch {
      toast({ title: t("shop_page.action_failed", { defaultValue: "Échec de l'opération" }), variant: "destructive" });
    }
  }

  function openPromoDialog(pack: CoachShopPack) {
    setPromoPrice(euros(pack.priceCents));
    setPromoDays("7");
    setPromoDialog({ open: true, pack });
  }

  async function handleCreatePromo() {
    if (!promoDialog.pack) return;
    try {
      await createPromoMutation.mutateAsync({
        data: {
          packId: promoDialog.pack.id,
          discountedPriceCents: toCents(promoPrice),
          durationDays: parseInt(promoDays, 10) || 1,
        },
      });
      toast({ title: t("shop_page.promo_created", { defaultValue: "Promo lancée" }) });
      setPromoDialog({ open: false });
      refetchPacks();
    } catch {
      toast({ title: t("shop_page.save_failed", { defaultValue: "Échec de l'enregistrement" }), variant: "destructive" });
    }
  }

  async function handleEndPromo(promoId: string) {
    setEndingPromoId(promoId);
    try {
      await endPromoMutation.mutateAsync({ id: promoId });
      toast({ title: t("shop_page.promo_ended", { defaultValue: "Promo terminée" }) });
      refetchPacks();
    } catch {
      toast({ title: t("shop_page.action_failed", { defaultValue: "Échec de l'opération" }), variant: "destructive" });
    } finally {
      setEndingPromoId(null);
    }
  }

  function openEditSub(sub: SubscriptionPlan) {
    setSubPrice(euros(sub.priceCents));
    setSubEngagement(sub.engagementMonths != null ? String(sub.engagementMonths) : "");
    setSubDialog({ open: true, sub });
  }

  async function handleSaveSub() {
    if (!subDialog.sub) return;
    try {
      await updateSubMutation.mutateAsync({
        id: subDialog.sub.id,
        data: {
          priceCents: toCents(subPrice),
          engagementMonths: subEngagement ? parseInt(subEngagement, 10) : null,
        },
      });
      toast({ title: t("shop_page.sub_updated", { defaultValue: "Abonnement mis à jour" }) });
      setSubDialog({ open: false });
      refetchSubs();
    } catch {
      toast({ title: t("shop_page.save_failed", { defaultValue: "Échec de l'enregistrement" }), variant: "destructive" });
    }
  }

  const packList = packs ?? [];
  const subList = subs ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" /> {t("shop_page.title", { defaultValue: "BOUTIQUE" })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("shop_page.subtitle", { defaultValue: "Packs de crédits, promotions et abonnements." })}
          </p>
        </div>
        {activeTab === "packs" && (
          <Button onClick={openNewPack} className="gap-2 bg-primary text-black hover:bg-primary/90 font-bold">
            <Plus className="w-4 h-4" /> {t("shop_page.new_pack", { defaultValue: "Nouveau pack" })}
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {(["packs", "subscriptions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            {tab === "packs" ? <CreditCard className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            {tab === "packs" ? t("shop_page.tab_packs", { defaultValue: "Packs" }) : t("shop_page.tab_subscriptions", { defaultValue: "Abonnements" })}
          </button>
        ))}
      </div>

      {activeTab === "packs" && (
        <div className="space-y-3">
          {packsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {!packsLoading && packList.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">{t("shop_page.no_packs", { defaultValue: "Aucun pack créé." })}</p>
            </div>
          )}
          {packList.map((pack) => (
            <div key={pack.id} className={`bg-card border rounded-xl p-4 ${pack.isActive ? "border-border" : "border-border/40 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{pack.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {pack.creditType === "collectif" ? t("shop_page.type_collectif", { defaultValue: "Collectif" }) : t("shop_page.type_individuel", { defaultValue: "1:1" })}
                    </span>
                    {pack.tag && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {pack.tag}
                      </span>
                    )}
                    {!pack.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {t("shop_page.inactive", { defaultValue: "INACTIF" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pack.credits} {t("shop_page.credits_label", { defaultValue: "crédits" })}
                    {pack.validityMonths ? ` · ${t("shop_page.valid_months", { count: pack.validityMonths, defaultValue: `valable ${pack.validityMonths} mois` })}` : ""}
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    {pack.activePromo ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through font-mono">{euros(pack.priceCents)} €</span>
                        <span className="text-lg font-mono font-bold text-green-400">{euros(pack.activePromo.discountedPriceCents)} €</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {t("shop_page.promo_until", { defaultValue: "jusqu'au" })} {format(new Date(pack.activePromo.expiresAt), "d MMM yyyy", { locale: fr })}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-mono font-bold text-white">{euros(pack.priceCents)} €</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditPack(pack)} title={t("shop_page.edit", { defaultValue: "Modifier" }) as string}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeactivateId(pack.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {pack.activePromo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => handleEndPromo(pack.activePromo!.id)}
                      disabled={endingPromoId === pack.activePromo.id}
                    >
                      {endingPromoId === pack.activePromo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      {t("shop_page.end_promo", { defaultValue: "Terminer la promo" })}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openPromoDialog(pack)}>
                      <Percent className="w-3.5 h-3.5" /> {t("shop_page.launch_promo", { defaultValue: "Lancer une promo" })}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div className="space-y-3">
          {subsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {!subsLoading && subList.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <Repeat className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">{t("shop_page.no_subs", { defaultValue: "Aucun abonnement configuré." })}</p>
            </div>
          )}
          {subList.map((sub) => (
            <div key={sub.id} className={`bg-card border rounded-xl p-4 ${sub.isActive ? "border-border" : "border-border/40 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{sub.name}</span>
                    {sub.tag && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {sub.tag}
                      </span>
                    )}
                  </div>
                  {sub.presentialText && <p className="text-sm text-muted-foreground mt-1">{sub.presentialText}</p>}
                  <p className="text-sm text-muted-foreground mt-1">
                    {sub.engagementMonths
                      ? `${t("shop_page.engagement", { defaultValue: "Engagement" })} ${sub.engagementMonths} ${t("shop_page.months", { defaultValue: "mois" })}`
                      : t("shop_page.no_engagement", { defaultValue: "Sans engagement" })}
                  </p>
                  <p className="text-lg font-mono font-bold text-white mt-2">
                    {euros(sub.priceCents)} € <span className="text-xs text-muted-foreground font-normal">/ {t("shop_page.month", { defaultValue: "mois" })}</span>
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEditSub(sub)} title={t("shop_page.edit", { defaultValue: "Modifier" }) as string}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pack create/edit dialog */}
      <Dialog open={packDialog.open} onOpenChange={(o) => setPackDialog({ open: o })}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-white">
              {packDialog.pack ? t("shop_page.dialog_edit_pack", { defaultValue: "Modifier le pack" }) : t("shop_page.dialog_new_pack", { defaultValue: "Nouveau pack" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_type", { defaultValue: "Type" })}</Label>
                <Select value={packForm.creditType} onValueChange={(v) => setPackForm((f) => ({ ...f, creditType: v as "collectif" | "individuel" }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collectif">{t("shop_page.type_collectif", { defaultValue: "Collectif" })}</SelectItem>
                    <SelectItem value="individuel">{t("shop_page.type_individuel", { defaultValue: "1:1" })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_credits", { defaultValue: "Crédits" })}</Label>
                <Input type="number" min={1} value={packForm.credits} onChange={(e) => setPackForm((f) => ({ ...f, credits: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_name", { defaultValue: "Nom" })}</Label>
              <Input value={packForm.name} onChange={(e) => setPackForm((f) => ({ ...f, name: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_price", { defaultValue: "Prix (€)" })}</Label>
                <Input type="number" min={0} step="0.01" value={packForm.priceEuros} onChange={(e) => setPackForm((f) => ({ ...f, priceEuros: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_validity", { defaultValue: "Validité (mois)" })}</Label>
                <Input type="number" min={1} placeholder={t("shop_page.no_expiry", { defaultValue: "Illimité" }) as string} value={packForm.validityMonths} onChange={(e) => setPackForm((f) => ({ ...f, validityMonths: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_tag", { defaultValue: "Étiquette (optionnel)" })}</Label>
              <Input value={packForm.tag} onChange={(e) => setPackForm((f) => ({ ...f, tag: e.target.value }))} placeholder={t("shop_page.tag_placeholder", { defaultValue: "Populaire, Nouveau..." }) as string} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPackDialog({ open: false })}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button onClick={handleSavePack} disabled={createPackMutation.isPending || updatePackMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {(createPackMutation.isPending || updatePackMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save", { defaultValue: "Enregistrer" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivateId} onOpenChange={(o) => !o && setDeactivateId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">{t("shop_page.deactivate_title", { defaultValue: "Désactiver ce pack ?" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("shop_page.deactivate_desc", { defaultValue: "Les achats déjà effectués restent valides. Le pack ne sera plus proposé à l'achat." })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t("common.cancel", { defaultValue: "Annuler" })}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDeactivatePack} disabled={deletePackMutation.isPending}>
              {deletePackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("shop_page.deactivate", { defaultValue: "Désactiver" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promo dialog */}
      <Dialog open={promoDialog.open} onOpenChange={(o) => setPromoDialog({ open: o })}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("shop_page.dialog_promo", { defaultValue: "Lancer une promo" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{promoDialog.pack?.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_promo_price", { defaultValue: "Prix promo (€)" })}</Label>
                <Input type="number" min={0} step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_duration_days", { defaultValue: "Durée (jours)" })}</Label>
                <Input type="number" min={1} max={90} value={promoDays} onChange={(e) => setPromoDays(e.target.value)} className="bg-background border-border" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPromoDialog({ open: false })}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button onClick={handleCreatePromo} disabled={createPromoMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {createPromoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("shop_page.launch", { defaultValue: "Lancer" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription edit dialog */}
      <Dialog open={subDialog.open} onOpenChange={(o) => setSubDialog({ open: o })}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("shop_page.dialog_edit_sub", { defaultValue: "Modifier l'abonnement" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{subDialog.sub?.name}</p>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_price_month", { defaultValue: "Prix mensuel (€)" })}</Label>
              <Input type="number" min={0} step="0.01" value={subPrice} onChange={(e) => setSubPrice(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("shop_page.field_engagement", { defaultValue: "Engagement (mois, optionnel)" })}</Label>
              <Input type="number" min={1} max={12} placeholder={t("shop_page.no_engagement", { defaultValue: "Sans engagement" }) as string} value={subEngagement} onChange={(e) => setSubEngagement(e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubDialog({ open: false })}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button onClick={handleSaveSub} disabled={updateSubMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {updateSubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save", { defaultValue: "Enregistrer" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
