import { useState } from "react";
import {
  useGetScheduledNotifications,
  useCreateScheduledNotification,
  useUpdateScheduledNotification,
  useDeleteScheduledNotification,
  useGetMorningNotifHour,
  useUpdateMorningNotifHour,
  useGetClients,
} from "@workspace/api-client-react";
import type { ScheduledNotification, CreateScheduledNotificationRequest } from "@workspace/api-client-react";
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Sun,
  ToggleLeft,
  ToggleRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Tous les jours",
  weekly: "Hebdomadaire",
  custom: "Personnalisé",
};

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function athleteName(n: ScheduledNotification) {
  const first = n.athleteFirstName ?? "";
  const last = n.athleteLastName ?? "";
  return `${first} ${last}`.trim() || "Athlète";
}

export default function NotificationsPage() {
  const { data: notifications, isLoading, refetch } = useGetScheduledNotifications(undefined, {
    query: { queryKey: ["/api/coach/scheduled-notifications"] },
  });
  const { data: morningData, refetch: refetchMorning } = useGetMorningNotifHour({
    query: { queryKey: ["/api/coach/morning-notif-hour"] },
  });
  const { data: clients } = useGetClients({ query: { queryKey: ["/api/coach/clients"] } });

  const createMutation = useCreateScheduledNotification();
  const updateMutation = useUpdateScheduledNotification();
  const deleteMutation = useDeleteScheduledNotification();
  const updateHourMutation = useUpdateMorningNotifHour();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ScheduledNotification | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [morningHour, setMorningHour] = useState<number | null>(null);
  const [savingHour, setSavingHour] = useState(false);

  const [form, setForm] = useState<Partial<CreateScheduledNotificationRequest>>({
    recurrenceType: "daily",
    sendHour: 8,
    recurrenceConfig: {},
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const currentMorningHour = morningHour ?? (morningData?.hour ?? 7);

  const handleSaveMorningHour = async (hour: number) => {
    setSavingHour(true);
    try {
      await updateHourMutation.mutateAsync({ data: { hour } });
      setMorningHour(hour);
      refetchMorning();
      toast({ title: "Heure matinale mise à jour" });
    } catch {
      toast({ title: "Échec de la mise à jour", variant: "destructive" });
    } finally {
      setSavingHour(false);
    }
  };

  const resetForm = () => {
    setForm({ recurrenceType: "daily", sendHour: 8, recurrenceConfig: {} });
    setSelectedDays([]);
    setEditItem(null);
  };

  const openEdit = (n: ScheduledNotification) => {
    setEditItem(n);
    const days = (n.recurrenceConfig?.["days"] as number[] | undefined) ?? [];
    setSelectedDays(days);
    setForm({
      message: n.message,
      recurrenceType: n.recurrenceType,
      sendHour: n.sendHour,
      recurrenceConfig: n.recurrenceConfig,
    });
    setShowCreate(true);
  };

  const toggleDay = (d: number) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = async () => {
    if (!form.message?.trim()) {
      toast({ title: "Message requis", variant: "destructive" });
      return;
    }
    if (!editItem && !form.athleteId) {
      toast({ title: "Athlète requis", variant: "destructive" });
      return;
    }
    const config: Record<string, unknown> =
      form.recurrenceType !== "daily" ? { days: selectedDays } : {};

    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          data: {
            message: form.message,
            recurrenceType: form.recurrenceType,
            recurrenceConfig: config,
            sendHour: form.sendHour,
          },
        });
        toast({ title: "Rappel mis à jour" });
      } else {
        await createMutation.mutateAsync({
          data: {
            athleteId: form.athleteId!,
            message: form.message!,
            recurrenceType: form.recurrenceType as CreateScheduledNotificationRequest["recurrenceType"],
            recurrenceConfig: config,
            sendHour: form.sendHour ?? 8,
          },
        });
        toast({ title: "Rappel créé" });
      }
      setShowCreate(false);
      resetForm();
      refetch();
    } catch {
      toast({ title: "Échec de l'opération", variant: "destructive" });
    }
  };

  const handleToggleActive = async (n: ScheduledNotification) => {
    try {
      await updateMutation.mutateAsync({ id: n.id, data: { active: !n.active } });
      refetch();
    } catch {
      toast({ title: "Échec", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Rappel supprimé" });
      setDeleteId(null);
      refetch();
    } catch {
      toast({ title: "Échec de la suppression", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" /> NOTIFICATIONS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Motivations matinales et rappels programmés pour vos athlètes.
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="gap-2 bg-primary text-black hover:bg-primary/90 font-bold"
        >
          <Plus className="w-4 h-4" /> Nouveau rappel
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-display text-white">Phrase matinale automatique</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Chaque matin, vos athlètes reçoivent une phrase de motivation + le résumé de leur séance du jour.
          Choisissez l'heure d'envoi ci-dessous.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select
              value={String(currentMorningHour)}
              onValueChange={(v) => handleSaveMorningHour(Number(v))}
            >
              <SelectTrigger className="w-32 bg-background border-border">
                <SelectValue placeholder="Heure" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatHour(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {savingHour && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <span className="text-xs text-muted-foreground">
            Envoi quotidien à {formatHour(currentMorningHour)} pour tous vos athlètes.
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-display text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Rappels personnalisés
        </h2>
        {(!notifications || notifications.length === 0) ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">Aucun rappel programmé.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Créez des rappels personnalisés pour motiver vos athlètes.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onEdit={() => openEdit(n)}
              onDelete={() => setDeleteId(n.id)}
              onToggleActive={() => handleToggleActive(n)}
            />
          ))
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-white">
              {editItem ? "Modifier le rappel" : "Nouveau rappel"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editItem && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Athlète</Label>
                <Select value={form.athleteId ?? ""} onValueChange={(v) => setForm(f => ({ ...f, athleteId: v }))}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Sélectionner un athlète" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Message</Label>
              <Textarea
                value={form.message ?? ""}
                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Bois au moins 2L d'eau aujourd'hui !"
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Récurrence</Label>
                <Select
                  value={form.recurrenceType ?? "daily"}
                  onValueChange={(v) => setForm(f => ({ ...f, recurrenceType: v as CreateScheduledNotificationRequest["recurrenceType"] }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Tous les jours</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Heure d'envoi</Label>
                <Select
                  value={String(form.sendHour ?? 8)}
                  onValueChange={(v) => setForm(f => ({ ...f, sendHour: Number(v) }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(form.recurrenceType === "weekly" || form.recurrenceType === "custom") && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Jours</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
                        selectedDays.includes(idx)
                          ? "bg-primary text-black border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary text-black hover:bg-primary/90 font-bold"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editItem ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Supprimer le rappel ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationCard({
  notification: n,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  notification: ScheduledNotification;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const days = (n.recurrenceConfig?.["days"] as number[] | undefined) ?? [];
  const dayStr = n.recurrenceType === "daily"
    ? "Tous les jours"
    : days.length > 0
    ? days.map((d) => DAY_LABELS[d]).join(", ")
    : RECURRENCE_LABELS[n.recurrenceType] ?? n.recurrenceType;

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${n.active ? "border-border" : "border-border/40 opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-primary uppercase">
              {athleteName(n)}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${n.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {n.active ? "ACTIF" : "INACTIF"}
            </span>
          </div>
          <p className="text-sm text-white leading-snug">{n.message}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{formatHour(n.sendHour)}
            </span>
            <span>{dayStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            onClick={onToggleActive}
            title={n.active ? "Désactiver" : "Activer"}
          >
            {n.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-white"
            onClick={onEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
