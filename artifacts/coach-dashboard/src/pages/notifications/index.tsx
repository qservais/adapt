import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  useGetScheduledNotifications,
  useCreateScheduledNotification,
  useUpdateScheduledNotification,
  useDeleteScheduledNotification,
  useGetMorningNotifHour,
  useUpdateMorningNotifHour,
  useGetClients,
  useGetMotivationPhrases,
  useCreateMotivationPhrase,
  useUpdateMotivationPhrase,
  useDeleteMotivationPhrase,
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
  Quote,
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function athleteName(n: ScheduledNotification, fallback: string, allLabel: string) {
  if (n.athleteId === null) return allLabel;
  const first = n.athleteFirstName ?? "";
  const last = n.athleteLastName ?? "";
  return `${first} ${last}`.trim() || fallback;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { data: notifications, isLoading, refetch } = useGetScheduledNotifications({
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

  const { data: phrases, refetch: refetchPhrases } = useGetMotivationPhrases({
    query: { queryKey: ["/api/coach/motivation-phrases"] },
  });
  const createPhraseMutation = useCreateMotivationPhrase();
  const updatePhraseMutation = useUpdateMotivationPhrase();
  const deletePhraseMutation = useDeleteMotivationPhrase();
  const [newPhrase, setNewPhrase] = useState("");
  const [deletePhraseId, setDeletePhraseId] = useState<string | null>(null);

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
      toast({ title: t("notifications_page.morning_hour_updated") });
    } catch {
      toast({ title: t("notifications_page.update_failed"), variant: "destructive" });
    } finally {
      setSavingHour(false);
    }
  };

  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) return;
    try {
      await createPhraseMutation.mutateAsync({ data: { text: newPhrase.trim() } });
      setNewPhrase("");
      refetchPhrases();
      toast({ title: t("notifications_page.phrase_added") });
    } catch {
      toast({ title: t("notifications_page.operation_failed"), variant: "destructive" });
    }
  };

  const handleTogglePhraseActive = async (id: string, active: boolean) => {
    try {
      await updatePhraseMutation.mutateAsync({ id, data: { active: !active } });
      refetchPhrases();
    } catch {
      toast({ title: t("notifications_page.operation_failed"), variant: "destructive" });
    }
  };

  const handleDeletePhrase = async (id: string) => {
    try {
      await deletePhraseMutation.mutateAsync({ id });
      refetchPhrases();
      setDeletePhraseId(null);
      toast({ title: t("notifications_page.phrase_deleted") });
    } catch {
      toast({ title: t("notifications_page.delete_failed"), variant: "destructive" });
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
      toast({ title: t("notifications_page.msg_required"), variant: "destructive" });
      return;
    }
    if (!editItem && form.athleteId === undefined) {
      toast({ title: t("notifications_page.athlete_required"), variant: "destructive" });
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
        toast({ title: t("notifications_page.reminder_updated") });
      } else {
        await createMutation.mutateAsync({
          data: {
            athleteId: form.athleteId ?? null,
            message: form.message!,
            recurrenceType: form.recurrenceType as CreateScheduledNotificationRequest["recurrenceType"],
            recurrenceConfig: config,
            sendHour: form.sendHour ?? 8,
          },
        });
        toast({ title: t("notifications_page.reminder_created") });
      }
      setShowCreate(false);
      resetForm();
      refetch();
    } catch {
      toast({ title: t("notifications_page.operation_failed"), variant: "destructive" });
    }
  };

  const handleToggleActive = async (n: ScheduledNotification) => {
    try {
      await updateMutation.mutateAsync({ id: n.id, data: { active: !n.active } });
      refetch();
    } catch {
      toast({ title: t("notifications_page.operation_failed"), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: t("notifications_page.reminder_deleted") });
      setDeleteId(null);
      refetch();
    } catch {
      toast({ title: t("notifications_page.delete_failed"), variant: "destructive" });
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
            <Bell className="w-8 h-8 text-primary" /> {t("notifications_page.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("notifications_page.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="gap-2 bg-primary text-black hover:bg-primary/90 font-bold"
        >
          <Plus className="w-4 h-4" /> {t("notifications_page.btn_new_reminder")}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-display text-white">{t("notifications_page.morning_phrase_title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("notifications_page.morning_phrase_desc")}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select
              value={String(currentMorningHour)}
              onValueChange={(v) => handleSaveMorningHour(Number(v))}
            >
              <SelectTrigger className="w-32 bg-background border-border">
                <SelectValue placeholder={t("notifications_page.morning_hour_placeholder")} />
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
            {t("notifications_page.morning_send_at", { hour: formatHour(currentMorningHour) })}
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Quote className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display text-white">{t("notifications_page.phrases_title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t("notifications_page.phrases_desc")}</p>
        <div className="flex items-center gap-2 mb-4">
          <Input
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddPhrase(); }}
            placeholder={t("notifications_page.phrases_add_placeholder")}
            className="bg-background border-border"
          />
          <Button
            onClick={handleAddPhrase}
            disabled={createPhraseMutation.isPending || !newPhrase.trim()}
            className="gap-1.5 bg-primary text-black hover:bg-primary/90 font-bold shrink-0"
          >
            {createPhraseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        {(!phrases || phrases.length === 0) ? (
          <p className="text-sm text-muted-foreground">{t("notifications_page.phrases_empty")}</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {phrases.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${p.active ? "border-border" : "border-border/40 opacity-50"}`}
              >
                <p className="flex-1 text-sm text-white min-w-0 truncate">{p.text}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary shrink-0"
                  onClick={() => handleTogglePhraseActive(p.id, p.active)}
                  title={p.active ? t("notifications_page.deactivate") : t("notifications_page.activate")}
                >
                  {p.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setDeletePhraseId(p.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-display text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> {t("notifications_page.custom_reminders_title")}
        </h2>
        {(!notifications || notifications.length === 0) ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">{t("notifications_page.no_reminders")}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {t("notifications_page.no_reminders_hint")}
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
              {editItem ? t("notifications_page.dialog_edit") : t("notifications_page.dialog_new")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editItem && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("notifications_page.label_athlete")}</Label>
                <Select
                  value={form.athleteId === null ? "__all__" : (form.athleteId ?? "")}
                  onValueChange={(v) => setForm(f => ({ ...f, athleteId: v === "__all__" ? null : v }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder={t("notifications_page.select_athlete_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="font-bold text-primary">
                      {t("notifications_page.all_athletes_option")}
                    </SelectItem>
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
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("notifications_page.label_message")}</Label>
              <Textarea
                value={form.message ?? ""}
                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={t("notifications_page.message_placeholder")}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("notifications_page.label_recurrence")}</Label>
                <Select
                  value={form.recurrenceType ?? "daily"}
                  onValueChange={(v) => setForm(f => ({ ...f, recurrenceType: v as CreateScheduledNotificationRequest["recurrenceType"] }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("notifications_page.recurrence_daily")}</SelectItem>
                    <SelectItem value="weekly">{t("notifications_page.recurrence_weekly")}</SelectItem>
                    <SelectItem value="custom">{t("notifications_page.recurrence_custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("notifications_page.label_send_hour")}</Label>
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
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("notifications_page.label_days")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(t("notifications_page.day_labels", { returnObjects: true }) as string[]).map((label, idx) => (
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
              {t("common.cancel", { defaultValue: "Annuler" })}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary text-black hover:bg-primary/90 font-bold"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editItem ? t("common.save", { defaultValue: "Enregistrer" }) : t("common.create", { defaultValue: "Créer" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("notifications_page.delete_confirm")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("notifications_page.irreversible")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.delete", { defaultValue: "Supprimer" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePhraseId} onOpenChange={(o) => { if (!o) setDeletePhraseId(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-white">{t("notifications_page.phrase_delete_confirm")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("notifications_page.irreversible")}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletePhraseId(null)}>{t("common.cancel", { defaultValue: "Annuler" })}</Button>
            <Button
              variant="destructive"
              onClick={() => deletePhraseId && handleDeletePhrase(deletePhraseId)}
              disabled={deletePhraseMutation.isPending}
            >
              {deletePhraseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.delete", { defaultValue: "Supprimer" })}
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
  const { t } = useTranslation();
  const dayLabels = t("notifications_page.day_labels", { returnObjects: true }) as string[];
  const recurrenceLabels: Record<string, string> = {
    daily: t("notifications_page.recurrence_daily"),
    weekly: t("notifications_page.recurrence_weekly"),
    custom: t("notifications_page.recurrence_custom"),
  };
  const days = (n.recurrenceConfig?.["days"] as number[] | undefined) ?? [];
  const dayStr = n.recurrenceType === "daily"
    ? t("notifications_page.recurrence_daily")
    : days.length > 0
    ? days.map((d) => dayLabels[d]).join(", ")
    : recurrenceLabels[n.recurrenceType] ?? n.recurrenceType;

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${n.active ? "border-border" : "border-border/40 opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-primary uppercase">
              {athleteName(n, t("notifications_page.default_athlete_label"), t("notifications_page.all_athletes_option"))}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${n.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {n.active ? t("notifications_page.active") : t("notifications_page.inactive")}
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
            title={n.active ? t("notifications_page.deactivate") : t("notifications_page.activate")}
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
