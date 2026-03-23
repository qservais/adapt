import { useState, useMemo } from "react";
import {
  useAddProgramSession,
  useUpdateProgramSession,
  useDeleteProgramSession,
  useGetProgram,
  useGetExercises,
  SessionWithVariants,
  ExerciseData,
  CreateSessionRequestVariantsItemMode,
} from "@workspace/api-client-react";
import { Sparkles, Plus, Trash2, Loader2, Dumbbell, Search, X, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export const MODE_STYLES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  performance: { label: "Performance", color: "text-primary", border: "border-primary", bg: "bg-primary/10" },
  normal: { label: "Normal", color: "text-secondary", border: "border-secondary", bg: "bg-secondary/10" },
  adapt: { label: "Adapt", color: "text-accent", border: "border-accent", bg: "bg-accent/10" },
  recovery: { label: "Récupération", color: "text-violet-400", border: "border-violet-400", bg: "bg-violet-400/10" },
};

export const SESSION_TYPES = ["strength", "cardio", "hybrid", "mobility"] as const;
export const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hybrid: "Hybride",
  mobility: "Mobilité",
};
export const MODES = ["performance", "normal", "adapt", "recovery"] as const;
export const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export interface ExerciseRow {
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: number;
  reps: string;
  loadKg: number;
  restSeconds: number;
  coachCue: string;
}

export interface SessionDraft {
  name: string;
  type: typeof SESSION_TYPES[number];
  estimatedDurationMin: number;
  coachNotes: string;
  normalExercises: ExerciseRow[];
}

export const emptySession = (): SessionDraft => ({
  name: "",
  type: "strength",
  estimatedDurationMin: 60,
  coachNotes: "",
  normalExercises: [],
});

export function sessionToDraft(session: SessionWithVariants): SessionDraft {
  const normalVariant = session.variants.find((v) => v.mode === "normal");
  return {
    name: session.name,
    type: session.type as typeof SESSION_TYPES[number],
    estimatedDurationMin: session.estimatedDurationMin || 60,
    coachNotes: session.coachNotes || "",
    normalExercises: normalVariant
      ? normalVariant.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          orderIndex: e.orderIndex,
          sets: e.sets,
          reps: e.reps || "",
          loadKg: e.nominalLoadKg || 0,
          restSeconds: e.restSeconds || 60,
          coachCue: e.coachCue || "",
        }))
      : [],
  };
}

interface ExercisePickerProps {
  onAdd: (ex: ExerciseData) => void;
}

const EXERCISE_CATEGORIES = [
  { value: "compound", label: "Polyarticulaire" },
  { value: "isolation", label: "Isolation" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobilité" },
] as const;

export function ExercisePicker({ onAdd }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>("compound");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: exercises, refetch } = useGetExercises(
    { q: query || undefined },
    { query: { queryKey: ["/api/exercises", query], enabled: true } }
  );
  const filtered = (exercises || []).slice(0, 8);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`${import.meta.env.BASE_URL}api/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim(), category: newCategory }),
      });
      if (!res.ok) throw new Error();
      const created: ExerciseData = await res.json();
      toast({ title: `Exercice « ${created.name} » créé` });
      onAdd(created);
      setCreating(false);
      setNewName("");
      refetch();
    } catch {
      toast({ title: "Échec de la création", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un exercice..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-background border-border h-9 text-sm"
        />
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onAdd(ex)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm flex items-center gap-2 group transition-colors"
          >
            <Dumbbell className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
            <span className="text-white truncate">{ex.name}</span>
            {ex.category && (
              <span className="text-xs text-muted-foreground ml-auto shrink-0">{ex.category}</span>
            )}
          </button>
        ))}
        {filtered.length === 0 && !creating && (
          <p className="text-center py-2 text-sm text-muted-foreground">Aucun exercice trouvé</p>
        )}
      </div>

      {!creating ? (
        <button
          type="button"
          onClick={() => { setCreating(true); setNewName(query); }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/30 hover:border-primary/60 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Créer un nouvel exercice
        </button>
      ) : (
        <div className="border border-primary/30 rounded-lg p-3 space-y-2 bg-primary/5">
          <p className="text-[10px] font-mono text-primary uppercase tracking-wider">Nouvel exercice</p>
          <Input
            autoFocus
            placeholder="Nom de l'exercice..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="h-8 text-sm bg-background border-border"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-2 py-1 text-white text-xs"
          >
            {EXERCISE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 text-xs py-1.5 rounded border border-border text-muted-foreground hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || isSaving}
              className="flex-1 text-xs py-1.5 rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Créer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NormalEditorProps {
  exercises: ExerciseRow[];
  onChange: (exercises: ExerciseRow[]) => void;
}

export function NormalEditor({ exercises, onChange }: NormalEditorProps) {
  const addExercise = (ex: ExerciseData) => {
    onChange([...exercises, {
      exerciseId: ex.id,
      exerciseName: ex.name,
      orderIndex: exercises.length,
      sets: 3,
      reps: "8-10",
      loadKg: 0,
      restSeconds: 90,
      coachCue: "",
    }]);
  };

  const updateExercise = (idx: number, patch: Partial<ExerciseRow>) => {
    onChange(exercises.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const removeExercise = (idx: number) => {
    onChange(exercises.filter((_, i) => i !== idx).map((e, i) => ({ ...e, orderIndex: i })));
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const next = [...exercises];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((e, i) => ({ ...e, orderIndex: i })));
  };

  const style = MODE_STYLES["normal"];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {exercises.map((ex, idx) => (
          <div key={idx} className={`p-3 rounded-lg border ${style.border} ${style.bg} space-y-2`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`font-medium text-sm ${style.color} truncate flex-1`}>{ex.exerciseName}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => moveExercise(idx, -1)} className="p-1 hover:bg-white/10 rounded">
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => moveExercise(idx, 1)} className="p-1 hover:bg-white/10 rounded">
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => removeExercise(idx)} className="p-1 hover:bg-destructive/20 rounded">
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sets</label>
                <Input type="number" min={1} value={ex.sets} onChange={(e) => updateExercise(idx, { sets: +e.target.value })} className="h-7 text-xs bg-background border-border mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reps</label>
                <Input value={ex.reps} onChange={(e) => updateExercise(idx, { reps: e.target.value })} placeholder="8-10" className="h-7 text-xs bg-background border-border mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Charge (kg)</label>
                <Input type="number" min={0} value={ex.loadKg} onChange={(e) => updateExercise(idx, { loadKg: +e.target.value })} className="h-7 text-xs bg-background border-border mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Repos (s)</label>
                <Input type="number" min={0} value={ex.restSeconds} onChange={(e) => updateExercise(idx, { restSeconds: +e.target.value })} className="h-7 text-xs bg-background border-border mt-0.5" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Indication coach</label>
              <Input value={ex.coachCue} onChange={(e) => updateExercise(idx, { coachCue: e.target.value })} placeholder="Gainage serré, tempo 3-1-1..." className="h-7 text-xs bg-background border-border mt-0.5" />
            </div>
          </div>
        ))}
      </div>
      <div className="border border-dashed border-border rounded-lg p-3">
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Ajouter un exercice</p>
        <ExercisePicker onAdd={addExercise} />
      </div>
    </div>
  );
}

interface SessionModalProps {
  programId: string;
  weekNumber: number;
  dayNumber: number;
  session?: SessionWithVariants;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SessionModal({ programId, weekNumber, dayNumber, session, open, onClose, onSaved }: SessionModalProps) {
  const [draft, setDraft] = useState<SessionDraft>(() =>
    session ? sessionToDraft(session) : emptySession()
  );
  const [isSaving, setIsSaving] = useState(false);
  const addMutation = useAddProgramSession();
  const updateMutation = useUpdateProgramSession();
  const { toast } = useToast();

  const isEdit = !!session;
  const dayName = DAY_NAMES[dayNumber - 1] || `Jour ${dayNumber}`;

  const autoDurationMin = useMemo(() => {
    if (draft.normalExercises.length === 0) return null;
    const totalSeconds = draft.normalExercises.reduce((sum, ex) => {
      const sets = Math.max(ex.sets || 1, 1);
      const rest = Math.max(ex.restSeconds || 60, 0);
      return sum + sets * rest;
    }, 0);
    return Math.max(1, Math.round(totalSeconds / 60));
  }, [draft.normalExercises]);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Nom de séance requis", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        weekNumber,
        dayNumber,
        name: draft.name,
        type: draft.type,
        estimatedDurationMin: autoDurationMin ?? draft.estimatedDurationMin,
        coachNotes: draft.coachNotes,
        variants: draft.normalExercises.length > 0
          ? [{
              mode: "normal" as CreateSessionRequestVariantsItemMode,
              exercises: draft.normalExercises.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
                sets: e.sets,
                reps: e.reps,
                loadKg: e.loadKg,
                restSeconds: e.restSeconds,
                coachCue: e.coachCue,
              })),
            }]
          : [],
      };

      if (isEdit && session) {
        await updateMutation.mutateAsync({ programId, sessionId: session.id, data: payload });
      } else {
        await addMutation.mutateAsync({ programId, data: payload });
      }
      toast({ title: isEdit ? "Séance mise à jour" : "Séance ajoutée" });
      onSaved();
    } catch {
      toast({ title: "Échec de l'enregistrement", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-2xl tracking-widest text-white">
            {isEdit ? "MODIFIER" : "NOUVELLE"} SÉANCE — S{weekNumber} {dayName}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Nom de la séance</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ex : Force haut du corps"
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Type</label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as typeof SESSION_TYPES[number] }))}
              >
                <SelectTrigger className="bg-background border-border capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {SESSION_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{SESSION_TYPE_LABELS[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Durée estimée</label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={draft.estimatedDurationMin}
                  onChange={(e) => setDraft((d) => ({ ...d, estimatedDurationMin: +e.target.value }))}
                  className="bg-background border-border pr-24"
                />
                {autoDurationMin !== null && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-primary text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    ~{autoDurationMin} min
                  </div>
                )}
              </div>
              {autoDurationMin !== null && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Calculé automatiquement : {autoDurationMin} min (sets × repos)
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Notes coach</label>
              <Input
                value={draft.coachNotes}
                onChange={(e) => setDraft((d) => ({ ...d, coachNotes: e.target.value }))}
                placeholder="Notes optionnelles..."
                className="bg-background border-border"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Exercices — Variante Normale</p>
              <span className="text-[10px] font-mono text-muted-foreground">(référence)</span>
            </div>
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary font-medium">Variantes auto-générées</span> — À la sauvegarde, les variantes{" "}
                <span className="text-white">Performance</span> (×1.05),{" "}
                <span className="text-accent">Adapt</span> (×0.75, −1 série) et{" "}
                <span className="text-violet-400">Récupération</span> (×0.30, 2×12-15) seront créées automatiquement.
              </p>
            </div>
            <NormalEditor
              exercises={draft.normalExercises}
              onChange={(exercises) => setDraft((d) => ({ ...d, normalExercises: exercises }))}
            />
          </div>
        </div>

        <div className="shrink-0 flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="border-border" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Mettre à jour" : "Ajouter la séance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SessionCellProps {
  session?: SessionWithVariants;
  weekNumber: number;
  dayNumber: number;
  programId: string;
  onRefetch: () => void;
}

export function SessionCell({ session, weekNumber, dayNumber, programId, onRefetch }: SessionCellProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteProgramSession();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!session) return;
    try {
      await deleteMutation.mutateAsync({ programId, sessionId: session.id });
      toast({ title: "Séance supprimée" });
      onRefetch();
    } catch {
      toast({ title: "Échec de la suppression", variant: "destructive" });
    }
  };

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="w-full h-full min-h-[60px] rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <SessionModal
          programId={programId}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); onRefetch(); }}
        />
      </>
    );
  }

  const modeStyles = session.variants.reduce<Record<string, boolean>>((acc, v) => {
    if (v.exercises.length > 0) acc[v.mode] = true;
    return acc;
  }, {});

  return (
    <>
      <div
        className="group w-full min-h-[60px] rounded-lg border border-border bg-card hover:border-white/20 transition-all p-2 text-left relative overflow-hidden cursor-pointer"
        onClick={() => setEditOpen(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <p className="text-xs font-semibold text-white truncate leading-tight mb-1">{session.name}</p>
        <p className="text-[10px] font-mono text-muted-foreground capitalize mb-1.5">{SESSION_TYPE_LABELS[session.type] ?? session.type}</p>
        <div className="flex gap-0.5 flex-wrap">
          {MODES.filter((m) => modeStyles[m]).map((m) => (
            <span
              key={m}
              className={`text-[8px] uppercase font-bold px-1 py-0.5 rounded-sm ${MODE_STYLES[m].bg} ${MODE_STYLES[m].color}`}
            >
              {m[0]}
            </span>
          ))}
        </div>
        {session.estimatedDurationMin && (
          <p className="text-[9px] text-muted-foreground mt-1">{session.estimatedDurationMin}min</p>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-all"
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </div>

      <SessionModal
        programId={programId}
        weekNumber={weekNumber}
        dayNumber={dayNumber}
        session={session}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => { setEditOpen(false); onRefetch(); }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-white">Supprimer la séance ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprimera définitivement « {session.name} » du programme.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ProgramGridProps {
  programId: string;
}

export function ProgramGrid({ programId }: ProgramGridProps) {
  const { data: program, isLoading, refetch } = useGetProgram(programId, {
    query: { queryKey: ["/api/programs", programId], enabled: !!programId },
  });

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm italic">
        Programme introuvable.
      </div>
    );
  }

  const sessionMap = new Map<string, SessionWithVariants[]>();
  program.sessions.forEach((s) => {
    const key = `${s.weekNumber}-${s.dayNumber}`;
    const existing = sessionMap.get(key) ?? [];
    existing.push(s);
    sessionMap.set(key, existing);
  });

  const weeks = Array.from({ length: program.durationWeeks }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {weeks.map((week) => (
        <div key={week} className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-white/[0.02] border-b border-border">
            <h3 className="font-display text-sm text-white tracking-wider">SEMAINE {week}</h3>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES.map((dayLabel, idx) => {
                const dayNumber = idx + 1;
                const daySessions = sessionMap.get(`${week}-${dayNumber}`) ?? [];
                return (
                  <div key={dayNumber} className="space-y-1">
                    <p className="text-center text-[10px] font-mono text-muted-foreground uppercase">{dayLabel}</p>
                    {daySessions.map((session) => (
                      <SessionCell
                        key={session.id}
                        session={session}
                        weekNumber={week}
                        dayNumber={dayNumber}
                        programId={programId}
                        onRefetch={refetch}
                      />
                    ))}
                    <SessionCell
                      weekNumber={week}
                      dayNumber={dayNumber}
                      programId={programId}
                      onRefetch={refetch}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
