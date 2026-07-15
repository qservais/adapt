import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  useGetCoachAppointments,
  useConfirmOneOnOneRequest,
  useDeclineOneOnOneRequest,
  useDeleteCoachAppointment,
  useGetCoachAvailability,
  useAddCoachAvailabilitySlot,
  useRemoveCoachAvailabilitySlot,
  useCreateCoachAppointment,
  useGetClients,
} from "@workspace/api-client-react";
import { Handshake, Plus, Trash2, Loader2, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function OneOnOnePage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: appointments, isLoading: apptsLoading, refetch: refetchAppts } = useGetCoachAppointments({
    query: { queryKey: ["/api/coach/appointments"] },
  });
  const { data: slots, isLoading: slotsLoading, refetch: refetchSlots } = useGetCoachAvailability({
    query: { queryKey: ["/api/coach/availability"] },
  });
  const { data: clients } = useGetClients({ query: { queryKey: ["/api/coach/clients"] } });

  const confirmMutation = useConfirmOneOnOneRequest();
  const declineMutation = useDeclineOneOnOneRequest();
  const deleteApptMutation = useDeleteCoachAppointment();
  const addSlotMutation = useAddCoachAvailabilitySlot();
  const removeSlotMutation = useRemoveCoachAvailabilitySlot();
  const createApptMutation = useCreateCoachAppointment();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState("1");
  const [newSlotTime, setNewSlotTime] = useState("09:00");

  const [newApptOpen, setNewApptOpen] = useState(false);
  const [newApptAthlete, setNewApptAthlete] = useState("");
  const [newApptDateTime, setNewApptDateTime] = useState("");
  const [newApptDuration, setNewApptDuration] = useState("60");
  const [newApptLocation, setNewApptLocation] = useState("");

  async function handleConfirm(id: string) {
    setBusyId(id);
    try {
      await confirmMutation.mutateAsync({ id });
      toast({ title: t("one_on_one_page.confirmed", { defaultValue: "Rendez-vous confirmé" }) });
      refetchAppts();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      toast({
        title: status === 402
          ? t("one_on_one_page.insufficient_credits", { defaultValue: "Crédits 1:1 insuffisants pour cet athlète" })
          : t("one_on_one_page.action_failed", { defaultValue: "Échec de l'opération" }),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(id: string) {
    setBusyId(id);
    try {
      await declineMutation.mutateAsync({ id });
      toast({ title: t("one_on_one_page.declined", { defaultValue: "Demande refusée" }) });
      refetchAppts();
    } catch {
      toast({ title: t("one_on_one_page.action_failed", { defaultValue: "Échec de l'opération" }), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteAppt(id: string) {
    setBusyId(id);
    try {
      await deleteApptMutation.mutateAsync({ id });
      toast({ title: t("one_on_one_page.deleted", { defaultValue: "Rendez-vous supprimé" }) });
      refetchAppts();
    } catch {
      toast({ title: t("one_on_one_page.action_failed", { defaultValue: "Échec de l'opération" }), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddSlot() {
    try {
      await addSlotMutation.mutateAsync({ data: { dayOfWeek: parseInt(newSlotDay, 10), startTime: newSlotTime } });
      toast({ title: t("one_on_one_page.slot_added", { defaultValue: "Créneau ajouté" }) });
      setAddSlotOpen(false);
      refetchSlots();
    } catch {
      toast({ title: t("one_on_one_page.action_failed", { defaultValue: "Échec de l'opération" }), variant: "destructive" });
    }
  }

  async function handleRemoveSlot(id: string) {
    setBusyId(id);
    try {
      await removeSlotMutation.mutateAsync({ id });
      refetchSlots();
    } catch {
      toast({ title: t("one_on_one_page.action_failed", { defaultValue: "Échec de l'opération" }), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateAppt() {
    if (!newApptAthlete || !newApptDateTime) {
      toast({ title: t("one_on_one_page.fields_required", { defaultValue: "Athlète et date requis" }), variant: "destructive" });
      return;
    }
    try {
      await createApptMutation.mutateAsync({
        data: {
          athleteId: newApptAthlete,
          startAt: new Date(newApptDateTime).toISOString(),
          durationMin: parseInt(newApptDuration, 10) || 60,
          location: newApptLocation.trim() || undefined,
        },
      });
      toast({ title: t("one_on_one_page.appt_created", { defaultValue: "Rendez-vous créé" }) });
      setNewApptOpen(false);
      setNewApptAthlete("");
      setNewApptDateTime("");
      setNewApptLocation("");
      refetchAppts();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      toast({
        title: status === 402
          ? t("one_on_one_page.insufficient_credits", { defaultValue: "Crédits 1:1 insuffisants pour cet athlète" })
          : t("one_on_one_page.action_failed", { defaultValue: "Échec de l'opération" }),
        variant: "destructive",
      });
    }
  }

  const allAppts = appointments ?? [];
  const pending = allAppts.filter((a) => a.status === "pending").sort((a, b) => a.startAt.localeCompare(b.startAt));
  const upcoming = allAppts
    .filter((a) => a.status === "confirmed" && new Date(a.startAt) >= new Date())
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const slotList = [...(slots ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Handshake className="w-8 h-8 text-primary" /> {t("one_on_one_page.title", { defaultValue: "RENDEZ-VOUS 1:1" })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("one_on_one_page.subtitle", { defaultValue: "Disponibilités, demandes et rendez-vous." })}</p>
        </div>
        <Button onClick={() => setNewApptOpen(true)} className="gap-2 bg-primary text-black hover:bg-primary/90 font-bold">
          <Plus className="w-4 h-4" /> {t("one_on_one_page.new_appt", { defaultValue: "Nouveau rendez-vous" })}
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-display text-white">{t("one_on_one_page.pending_title", { defaultValue: "Demandes en attente" })}</h2>
          {pending.map((appt) => (
            <div key={appt.id} className="bg-card border border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white">{[appt.athleteFirstName, appt.athleteLastName].filter(Boolean).join(" ") || "Athlète"}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {fmtDateTime(appt.startAt)} · {appt.durationMin} min
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => handleDecline(appt.id)} disabled={busyId === appt.id}>
                  {busyId === appt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} {t("one_on_one_page.decline", { defaultValue: "Refuser" })}
                </Button>
                <Button size="sm" className="gap-1.5 bg-primary text-black hover:bg-primary/90" onClick={() => handleConfirm(appt.id)} disabled={busyId === appt.id}>
                  {busyId === appt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {t("one_on_one_page.confirm", { defaultValue: "Confirmer" })}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-display text-white">{t("one_on_one_page.upcoming_title", { defaultValue: "À venir" })}</h2>
        {apptsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {!apptsLoading && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("one_on_one_page.no_upcoming", { defaultValue: "Aucun rendez-vous à venir." })}</p>
        )}
        {upcoming.map((appt) => (
          <div key={appt.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white">{[appt.athleteFirstName, appt.athleteLastName].filter(Boolean).join(" ") || "Athlète"}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {fmtDateTime(appt.startAt)} · {appt.durationMin} min{appt.location ? ` · ${appt.location}` : ""}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAppt(appt.id)} disabled={busyId === appt.id}>
              {busyId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display text-white">{t("one_on_one_page.availability_title", { defaultValue: "Disponibilités récurrentes" })}</h2>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddSlotOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> {t("one_on_one_page.add_slot", { defaultValue: "Ajouter un créneau" })}
          </Button>
        </div>
        {slotsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {!slotsLoading && slotList.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("one_on_one_page.no_slots", { defaultValue: "Aucune disponibilité configurée." })}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {slotList.map((slot) => (
            <div key={slot.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
              <Badge variant="outline" className="text-xs">{DAY_LABELS[slot.dayOfWeek]}</Badge>
              <span className="text-sm font-mono text-white">{slot.startTime}</span>
              <button onClick={() => handleRemoveSlot(slot.id)} disabled={busyId === slot.id} className="text-muted-foreground hover:text-destructive">
                {busyId === slot.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("one_on_one_page.dialog_add_slot", { defaultValue: "Ajouter un créneau récurrent" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("one_on_one_page.field_day", { defaultValue: "Jour" })}</Label>
              <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("one_on_one_page.field_time", { defaultValue: "Heure" })}</Label>
              <input type="time" value={newSlotTime} onChange={(e) => setNewSlotTime(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddSlotOpen(false)}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button onClick={handleAddSlot} disabled={addSlotMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {addSlotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.add", { defaultValue: "Ajouter" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newApptOpen} onOpenChange={setNewApptOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("one_on_one_page.dialog_new_appt", { defaultValue: "Nouveau rendez-vous 1:1" })}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            {t("one_on_one_page.direct_booking_note", { defaultValue: "Confirmé immédiatement — débite 1 crédit 1:1 de l'athlète." })}
          </p>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("one_on_one_page.field_athlete", { defaultValue: "Athlète" })}</Label>
              <Select value={newApptAthlete} onValueChange={setNewApptAthlete}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder={t("one_on_one_page.select_athlete", { defaultValue: "Sélectionner" }) as string} /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("one_on_one_page.field_datetime", { defaultValue: "Date et heure" })}</Label>
              <input type="datetime-local" value={newApptDateTime} onChange={(e) => setNewApptDateTime(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("one_on_one_page.field_duration", { defaultValue: "Durée (min)" })}</Label>
                <Input type="number" min={15} value={newApptDuration} onChange={(e) => setNewApptDuration(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("one_on_one_page.field_location", { defaultValue: "Lieu (optionnel)" })}</Label>
                <Input value={newApptLocation} onChange={(e) => setNewApptLocation(e.target.value)} className="bg-background border-border" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewApptOpen(false)}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button onClick={handleCreateAppt} disabled={createApptMutation.isPending} className="bg-primary text-black hover:bg-primary/90 font-bold">
              {createApptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.create", { defaultValue: "Créer" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
