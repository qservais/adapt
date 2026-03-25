import { useState } from "react";
import { useGetCoachChallenges, useCreateCoachChallenge, useDeleteCoachChallenge } from "@workspace/api-client-react";
import type { CoachChallenge, CreateChallengeRequest } from "@workspace/api-client-react";
import { Trophy, Plus, Trash2, Loader2, Target, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
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
import { useGetClients } from "@workspace/api-client-react";

const METRIC_LABELS: Record<string, { label: string; defaultUnit: string }> = {
  reps: { label: "Répétitions", defaultUnit: "répétitions" },
  distance: { label: "Distance", defaultUnit: "km" },
  time: { label: "Durée", defaultUnit: "minutes" },
  sessions: { label: "Séances", defaultUnit: "séances" },
};

function progressPercent(progress: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

function daysRemaining(endDate: string) {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  const diff = differenceInDays(end, now);
  return diff;
}

export default function ChallengesPage() {
  const { data: challenges, isLoading, refetch } = useGetCoachChallenges({
    query: { queryKey: ["/api/coach/challenges"] },
  });
  const { data: clients } = useGetClients({ query: { queryKey: ["/api/coach/clients"] } });
  const createMutation = useCreateCoachChallenge();
  const deleteMutation = useDeleteCoachChallenge();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<CreateChallengeRequest>>({
    metric: "reps",
    athleteIds: [],
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.title || !form.metric || !form.target || !form.startDate || !form.endDate || !form.athleteIds?.length) {
      toast({ title: "Champs manquants", description: "Remplis tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: form.title!,
        description: form.description,
        metric: form.metric as CreateChallengeRequest["metric"],
        target: Number(form.target),
        unit: form.unit ?? METRIC_LABELS[form.metric!]?.defaultUnit,
        startDate: form.startDate!,
        endDate: form.endDate!,
        athleteIds: form.athleteIds!,
      });
      toast({ title: "Challenge créé" });
      setShowCreate(false);
      setForm({ metric: "reps", athleteIds: [] });
      refetch();
    } catch {
      toast({ title: "Échec de la création", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Challenge supprimé" });
      setDeleteId(null);
      refetch();
    } catch {
      toast({ title: "Échec de la suppression", variant: "destructive" });
    }
  };

  const toggleAthlete = (athleteId: string) => {
    setForm(f => {
      const current = f.athleteIds ?? [];
      return {
        ...f,
        athleteIds: current.includes(athleteId)
          ? current.filter(id => id !== athleteId)
          : [...current, athleteId],
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-accent" /> CHALLENGES
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Motivez vos athlètes avec des défis personnalisés.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Créer un challenge
        </Button>
      </div>

      {!challenges?.length ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Aucun challenge actif</p>
          <p className="text-muted-foreground text-sm mt-1">Créez le premier défi pour motiver vos athlètes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onDelete={() => setDeleteId(c.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">CRÉER UN CHALLENGE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Titre *</Label>
              <Input
                placeholder="Ex. : 100 pompes en 30 jours"
                value={form.title ?? ""}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                placeholder="Détails du défi (optionnel)"
                value={form.description ?? ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Métrique *</Label>
                <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v as CreateChallengeRequest["metric"], unit: METRIC_LABELS[v]?.defaultUnit }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METRIC_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Objectif *</Label>
                <Input
                  type="number"
                  placeholder="Ex. : 100"
                  value={form.target ?? ""}
                  onChange={e => setForm(f => ({ ...f, target: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Unité</Label>
              <Input
                placeholder={METRIC_LABELS[form.metric ?? "reps"]?.defaultUnit ?? ""}
                value={form.unit ?? ""}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date de début *</Label>
                <Input
                  type="date"
                  value={form.startDate ?? ""}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Date de fin *</Label>
                <Input
                  type="date"
                  value={form.endDate ?? ""}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Athlètes assignés *</Label>
              {!clients?.length ? (
                <p className="text-sm text-muted-foreground">Aucun athlète disponible</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => toggleAthlete(client.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                        form.athleteIds?.includes(client.id)
                          ? "border-primary bg-primary/10 text-white"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
                        form.athleteIds?.includes(client.id) ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {form.athleteIds?.includes(client.id) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {client.firstName} {client.lastName ?? ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le challenge ?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Cette action est irréversible. La progression des athlètes sera perdue.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChallengeCard({ challenge, onDelete }: { challenge: CoachChallenge; onDelete: () => void }) {
  const metricInfo = METRIC_LABELS[challenge.metric] ?? { label: challenge.metric, defaultUnit: "" };
  const days = daysRemaining(challenge.endDate);
  const isExpired = days < 0;

  return (
    <div className={`bg-card border rounded-xl p-5 space-y-4 ${isExpired ? "opacity-60" : "border-border"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
            {isExpired ? (
              <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">TERMINÉ</span>
            ) : (
              <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-sm bg-primary/20 text-primary">EN COURS</span>
            )}
          </div>
          {challenge.description && (
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
        <span className="flex items-center gap-1">
          <Target className="w-3.5 h-3.5" />
          {metricInfo.label} · {challenge.target} {challenge.unit}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {isExpired ? "Expiré" : `${days} j. restant${days > 1 ? "s" : ""}`}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {challenge.assignments.length} athlète{challenge.assignments.length > 1 ? "s" : ""}
        </span>
      </div>

      {challenge.assignments.length > 0 && (
        <div className="space-y-2">
          {challenge.assignments.map(a => {
            const pct = progressPercent(a.progress, challenge.target);
            return (
              <div key={a.athleteId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{a.athleteName}</span>
                  <span className={`font-mono font-bold ${a.completedAt ? "text-primary" : "text-white"}`}>
                    {a.progress} / {challenge.target} {challenge.unit}
                    {a.completedAt && " ✓"}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${a.completedAt ? "bg-primary" : "bg-primary/60"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
