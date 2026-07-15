import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  useGetCoachClassTemplates,
  useCreateClassTemplate,
  useUpdateClassTemplate,
  useDeleteClassTemplate,
  useScheduleClassTemplate,
  useGetCoachClassOccurrences,
  useGetOccurrenceParticipants,
  useManualRegisterForClass,
  useCancelClassOccurrence,
  useGetClients,
} from "@workspace/api-client-react";
import type { ClassTemplate, CoachClassOccurrence } from "@workspace/api-client-react";
import {
  Dumbbell, Plus, Pencil, Trash2, Loader2, Calendar, Users, X, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function euros(cents: number): string {
  return (cents / 100).toFixed(2);
}
function toCents(euroStr: string): number {
  return Math.round(parseFloat(euroStr || "0") * 100);
}
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type TemplateForm = {
  name: string;
  description: string;
  capacity: string;
  priceEuros: string;
  creditCost: string;
  durationMin: string;
  cancellationWindowHours: string;
};
const emptyTemplateForm: TemplateForm = { name: "", description: "", capacity: "10", priceEuros: "0", creditCost: "1", durationMin: "60", cancellationWindowHours: "24" };

export default function ClassesManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"templates" | "planning">("templates");

  // ─── Templates ──────────────────────────────────────────────────────────
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useGetCoachClassTemplates({
    query: { queryKey: ["/api/coach/classes/templates"] },
  });
  const createTemplateMutation = useCreateClassTemplate();
  const updateTemplateMutation = useUpdateClassTemplate();
  const deleteTemplateMutation = useDeleteClassTemplate();
  const scheduleMutation = useScheduleClassTemplate();

  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; template?: ClassTemplate }>({ open: false });
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const [scheduleDialog, setScheduleDialog] = useState<{ open: boolean; template?: ClassTemplate }>({ open: false });
  const [scheduleMode, setScheduleMode] = useState<"once" | "weekly">("once");
  const [scheduleStartAt, setScheduleStartAt] = useState("");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState("1");
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [scheduleWeeksAhead, setScheduleWeeksAhead] = useState("8");

  function openNewTemplate() {
    setTemplateForm(emptyTemplateForm);
    setTemplateDialog({ open: true });
  }
  function openEditTemplate(tpl: ClassTemplate) {
    setTemplateForm({
      name: tpl.name,
      description: tpl.description ?? "",
      capacity: String(tpl.capacity),
      priceEuros: euros(tpl.priceCents),
      creditCost: String(tpl.creditCost),
      durationMin: String(tpl.durationMin),
      cancellationWindowHours: tpl.cancellationWindowHours != null ? String(tpl.cancellationWindowHours) : "",
    });
    setTemplateDialog({ open: true, template: tpl });
  }

  async function handleSaveTemplate() {
    if (!templateForm.name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    const data = {
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || undefined,
      capacity: parseInt(templateForm.capacity, 10) || 1,
      priceCents: toCents(templateForm.priceEuros),
      creditCost: parseInt(templateForm.creditCost, 10) || 1,
      durationMin: parseInt(templateForm.durationMin, 10) || 60,
      cancellationWindowHours: templateForm.cancellationWindowHours ? parseInt(templateForm.cancellationWindowHours, 10) : null,
    };
    try {
      if (templateDialog.template) {
        await updateTemplateMutation.mutateAsync({ id: templateDialog.template.id, data });
        toast({ title: "Modèle mis à jour" });
      } else {
        await createTemplateMutation.mutateAsync({ data });
        toast({ title: "Modèle créé" });
      }
      setTemplateDialog({ open: false });
      refetchTemplates();
    } catch {
      toast({ title: "Échec de l'enregistrement", variant: "destructive" });
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateId) return;
    try {
      await deleteTemplateMutation.mutateAsync({ id: deleteTemplateId });
      toast({ title: "Modèle désactivé" });
      setDeleteTemplateId(null);
      refetchTemplates();
    } catch {
      toast({ title: "Échec de l'opération", variant: "destructive" });
    }
  }

  function openScheduleDialog(tpl: ClassTemplate) {
    setScheduleMode("once");
    setScheduleStartAt("");
    setScheduleDayOfWeek("1");
    setScheduleStartTime("09:00");
    setScheduleWeeksAhead("8");
    setScheduleDialog({ open: true, template: tpl });
  }

  async function handleSchedule() {
    if (!scheduleDialog.template) return;
    try {
      if (scheduleMode === "once") {
        if (!scheduleStartAt) {
          toast({ title: "Date et heure requises", variant: "destructive" });
          return;
        }
        await scheduleMutation.mutateAsync({
          id: scheduleDialog.template.id,
          data: { mode: "once", startAt: new Date(scheduleStartAt).toISOString() },
        });
      } else {
        await scheduleMutation.mutateAsync({
          id: scheduleDialog.template.id,
          data: {
            mode: "weekly",
            dayOfWeek: parseInt(scheduleDayOfWeek, 10),
            startTime: scheduleStartTime,
            weeksAhead: parseInt(scheduleWeeksAhead, 10) || 8,
          },
        });
      }
      toast({ title: "Cours programmé" });
      setScheduleDialog({ open: false });
      refetchOccurrences();
    } catch {
      toast({ title: "Échec de la programmation", variant: "destructive" });
    }
  }

  // ─── Planning / occurrences ─────────────────────────────────────────────
  const from = new Date();
  const to = addDays(from, 30);
  const { data: occurrences, isLoading: occLoading, refetch: refetchOccurrences } = useGetCoachClassOccurrences({
    from: from.toISOString(),
    to: to.toISOString(),
  }, { query: { queryKey: ["/api/coach/classes/occurrences"] } });

  const [rosterOcc, setRosterOcc] = useState<CoachClassOccurrence | null>(null);

  const templateList = templates ?? [];
  const occList = (occurrences ?? []).filter((o) => o.status === "scheduled").sort((a, b) => a.startAt.localeCompare(b.startAt));
  const days = Array.from({ length: 30 }, (_, i) => addDays(from, i));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-primary" /> COURS COLLECTIFS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Modèles de cours et planning.</p>
        </div>
        {activeTab === "templates" && (
          <Button onClick={openNewTemplate} className="gap-2 bg-primary text-black hover:bg-primary/90 font-bold">
            <Plus className="w-4 h-4" /> Nouveau modèle
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {(["templates", "planning"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            {tab === "templates" ? <Dumbbell className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            {tab === "templates" ? "Modèles" : "Planning"}
          </button>
        ))}
      </div>

      {activeTab === "templates" && (
        <div className="space-y-3">
          {templatesLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {!templatesLoading && templateList.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">Aucun modèle de cours créé.</p>
            </div>
          )}
          {templateList.map((tpl) => (
            <div key={tpl.id} className={`bg-card border rounded-xl p-4 ${tpl.isActive ? "border-border" : "border-border/40 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white">{tpl.name}</span>
                  {tpl.description && <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>}
                  <p className="text-xs text-muted-foreground font-mono mt-2">
                    {tpl.capacity} places · {tpl.durationMin} min · {tpl.creditCost} crédit{tpl.creditCost > 1 ? "s" : ""} · {euros(tpl.priceCents)} €
                    {tpl.cancellationWindowHours ? ` · annulation ${tpl.cancellationWindowHours}h avant` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openScheduleDialog(tpl)}>
                    <Calendar className="w-3.5 h-3.5" /> Programmer
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEditTemplate(tpl)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTemplateId(tpl.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "planning" && (
        <div className="space-y-4">
          {occLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {!occLoading && occList.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">Aucun cours programmé dans les 30 prochains jours.</p>
            </div>
          )}
          {days.map((day) => {
            const dayOccs = occList.filter((o) => isSameDay(new Date(o.startAt), day));
            if (dayOccs.length === 0) return null;
            return (
              <div key={day.toISOString()} className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {DAY_LABELS[day.getDay()]} {day.getDate()}/{day.getMonth() + 1}
                </p>
                {dayOccs.map((occ) => (
                  <button
                    key={occ.id}
                    onClick={() => setRosterOcc(occ)}
                    className="w-full text-left bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/50 transition-colors"
                  >
                    <span className="text-sm font-mono text-white w-14">{occ.startAt.slice(11, 16)}</span>
                    <span className="flex-1 text-sm text-white">{occ.name}</span>
                    <Badge variant={occ.spotsAvailable === 0 ? "destructive" : "outline"} className="gap-1">
                      <Users className="w-3 h-3" /> {occ.spotsBooked}/{occ.capacity}
                    </Badge>
                    {occ.waitlistCount > 0 && (
                      <Badge variant="secondary">{occ.waitlistCount} en attente</Badge>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Template create/edit dialog */}
      <Dialog open={templateDialog.open} onOpenChange={(o) => setTemplateDialog({ open: o })}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{templateDialog.template ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nom</Label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description (optionnel)</Label>
              <Textarea value={templateForm.description} onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))} className="bg-background border-border resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Capacité</Label>
                <Input type="number" min={1} value={templateForm.capacity} onChange={(e) => setTemplateForm((f) => ({ ...f, capacity: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Durée (min)</Label>
                <Input type="number" min={5} value={templateForm.durationMin} onChange={(e) => setTemplateForm((f) => ({ ...f, durationMin: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Prix (€)</Label>
                <Input type="number" min={0} step="0.01" value={templateForm.priceEuros} onChange={(e) => setTemplateForm((f) => ({ ...f, priceEuros: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Coût en crédits</Label>
                <Input type="number" min={1} value={templateForm.creditCost} onChange={(e) => setTemplateForm((f) => ({ ...f, creditCost: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Délai d'annulation (heures, optionnel)</Label>
              <Input type="number" min={0} placeholder="Délai par défaut du studio" value={templateForm.cancellationWindowHours} onChange={(e) => setTemplateForm((f) => ({ ...f, cancellationWindowHours: e.target.value }))} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTemplateDialog({ open: false })}>Annuler</Button>
            <Button onClick={handleSaveTemplate} disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(o) => !o && setDeleteTemplateId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">Désactiver ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>Les cours déjà programmés restent inchangés. Le modèle ne pourra plus être reprogrammé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDeleteTemplate} disabled={deleteTemplateMutation.isPending}>
              {deleteTemplateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule dialog */}
      <Dialog open={scheduleDialog.open} onOpenChange={(o) => setScheduleDialog({ open: o })}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Programmer « {scheduleDialog.template?.name} »</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {(["once", "weekly"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScheduleMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    scheduleMode === mode ? "bg-primary text-black border-primary" : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  {mode === "once" ? "Date unique" : "Récurrent (hebdo)"}
                </button>
              ))}
            </div>
            {scheduleMode === "once" ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Date et heure</Label>
                <input
                  type="datetime-local"
                  value={scheduleStartAt}
                  onChange={(e) => setScheduleStartAt(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Jour de la semaine</Label>
                  <Select value={scheduleDayOfWeek} onValueChange={setScheduleDayOfWeek}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_LABELS.map((label, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Heure</Label>
                    <input
                      type="time"
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Semaines à l'avance</Label>
                    <Input type="number" min={1} max={26} value={scheduleWeeksAhead} onChange={(e) => setScheduleWeeksAhead(e.target.value)} className="bg-background border-border" />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleDialog({ open: false })}>Annuler</Button>
            <Button onClick={handleSchedule} disabled={scheduleMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {scheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Programmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rosterOcc && (
        <RosterDialog occurrence={rosterOcc} onClose={() => setRosterOcc(null)} onChanged={() => refetchOccurrences()} />
      )}
    </div>
  );
}

function RosterDialog({ occurrence, onClose, onChanged }: { occurrence: CoachClassOccurrence; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const { data: participants, isLoading, refetch } = useGetOccurrenceParticipants(occurrence.id, {
    query: { queryKey: [`/api/coach/classes/occurrences/${occurrence.id}/participants`] },
  });
  const { data: clients } = useGetClients({ query: { queryKey: ["/api/coach/clients"] } });
  const registerMutation = useManualRegisterForClass();
  const cancelMutation = useCancelClassOccurrence();

  const [registerMode, setRegisterMode] = useState<"athlete" | "guest">("athlete");
  const [registerAthleteId, setRegisterAthleteId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"comped" | "credit" | "pay_on_site">("credit");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  async function handleRegister() {
    if (registerMode === "athlete" && !registerAthleteId) {
      toast({ title: "Sélectionne un athlète", variant: "destructive" });
      return;
    }
    if (registerMode === "guest" && !guestName.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    try {
      await registerMutation.mutateAsync({
        occurrenceId: occurrence.id,
        data: {
          athleteId: registerMode === "athlete" ? registerAthleteId : undefined,
          guestName: registerMode === "guest" ? guestName.trim() : undefined,
          paymentMode,
        },
      });
      toast({ title: "Participant inscrit" });
      setGuestName("");
      setRegisterAthleteId("");
      refetch();
      onChanged();
    } catch {
      toast({ title: "Échec de l'inscription (complet ?)", variant: "destructive" });
    }
  }

  async function handleCancelOccurrence() {
    try {
      const res = await cancelMutation.mutateAsync({ occurrenceId: occurrence.id, data: { note: cancelNote.trim() || undefined } });
      toast({ title: `Cours annulé — ${res.notifiedCount} athlète(s) notifié(s)` });
      setCancelConfirmOpen(false);
      onChanged();
      onClose();
    } catch {
      toast({ title: "Échec de l'annulation", variant: "destructive" });
    }
  }

  const list = participants ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-white flex items-center justify-between">
            <span>{occurrence.name}</span>
            <span className="text-sm text-muted-foreground font-mono font-normal">{occurrence.startAt.slice(0, 16).replace("T", " ")}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {!isLoading && list.length === 0 && <p className="text-sm text-muted-foreground">Aucun participant inscrit.</p>}
          <div className="space-y-1.5">
            {list.map((p) => (
              <div key={p.bookingId} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                <span className="text-sm text-white">{p.guestName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ?? "—"}</span>
                <div className="flex items-center gap-2">
                  {p.todayScore != null && (
                    <span className="text-xs font-mono text-primary">Score {p.todayScore}</span>
                  )}
                  <Badge variant="outline" className="text-[10px]">{p.paymentMode}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Inscrire manuellement
            </Label>
            <div className="flex gap-2">
              <button onClick={() => setRegisterMode("athlete")} className={`flex-1 py-1.5 rounded-md text-xs border ${registerMode === "athlete" ? "bg-primary text-black border-primary" : "bg-background text-muted-foreground border-border"}`}>Athlète existant</button>
              <button onClick={() => setRegisterMode("guest")} className={`flex-1 py-1.5 rounded-md text-xs border ${registerMode === "guest" ? "bg-primary text-black border-primary" : "bg-background text-muted-foreground border-border"}`}>Invité / essai</button>
            </div>
            {registerMode === "athlete" ? (
              <Select value={registerAthleteId} onValueChange={setRegisterAthleteId}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Sélectionner un athlète" /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nom de l'invité" className="bg-background border-border" />
            )}
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as typeof paymentMode)}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Crédit</SelectItem>
                <SelectItem value="comped">Offert</SelectItem>
                <SelectItem value="pay_on_site">Paiement sur place</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRegister} disabled={registerMutation.isPending} className="w-full bg-primary text-black hover:bg-primary/90 font-bold">
              {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Inscrire"}
            </Button>
          </div>
        </div>
        <DialogFooter className="border-t border-border pt-4">
          {!cancelConfirmOpen ? (
            <Button variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 w-full" onClick={() => setCancelConfirmOpen(true)}>
              <X className="w-4 h-4" /> Annuler ce cours
            </Button>
          ) : (
            <div className="w-full space-y-2">
              <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Note pour les athlètes (optionnel)" className="bg-background border-border resize-none" rows={2} />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setCancelConfirmOpen(false)}>Retour</Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancelOccurrence} disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer l'annulation"}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
