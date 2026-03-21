import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProgram,
  useGetPrograms,
  useAddProgramSession,
  useUpdateProgramSession,
  useDeleteProgramSession,
  useDeleteProgram,
  useGetExercises,
  addProgramSession,
  updateProgram,
  SessionWithVariants,
  ExerciseData,
  CreateSessionRequestVariantsItemMode,
} from "@workspace/api-client-react";
import { Sparkles } from "lucide-react";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Dumbbell,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const MODE_STYLES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  performance: { label: "Performance", color: "text-primary", border: "border-primary", bg: "bg-primary/10" },
  normal: { label: "Normal", color: "text-secondary", border: "border-secondary", bg: "bg-secondary/10" },
  adapt: { label: "Adapt", color: "text-accent", border: "border-accent", bg: "bg-accent/10" },
  recovery: { label: "Recovery", color: "text-violet-400", border: "border-violet-400", bg: "bg-violet-400/10" },
};

const SESSION_TYPES = ["strength", "cardio", "hybrid", "mobility"] as const;
const MODES = ["performance", "normal", "adapt", "recovery"] as const;
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface ExerciseRow {
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: number;
  reps: string;
  loadKg: number;
  restSeconds: number;
  coachCue: string;
}

interface SessionDraft {
  name: string;
  type: typeof SESSION_TYPES[number];
  estimatedDurationMin: number;
  coachNotes: string;
  normalExercises: ExerciseRow[];
}

const emptySession = (): SessionDraft => ({
  name: "",
  type: "strength",
  estimatedDurationMin: 60,
  coachNotes: "",
  normalExercises: [],
});

function sessionToDraft(session: SessionWithVariants): SessionDraft {
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

function ExercisePicker({ onAdd }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const { data: exercises } = useGetExercises(
    { q: query || undefined },
    { query: { queryKey: ["/api/exercises", query], enabled: true } }
  );

  const filtered = (exercises || []).slice(0, 8);

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
        {filtered.length === 0 && (
          <p className="text-center py-4 text-sm text-muted-foreground">Aucun exercice trouvé</p>
        )}
      </div>
    </div>
  );
}

interface NormalEditorProps {
  exercises: ExerciseRow[];
  onChange: (exercises: ExerciseRow[]) => void;
}

function NormalEditor({ exercises, onChange }: NormalEditorProps) {
  const addExercise = (ex: ExerciseData) => {
    const next: ExerciseRow = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      orderIndex: exercises.length,
      sets: 3,
      reps: "8-10",
      loadKg: 0,
      restSeconds: 90,
      coachCue: "",
    };
    onChange([...exercises, next]);
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

function SessionModal({ programId, weekNumber, dayNumber, session, open, onClose, onSaved }: SessionModalProps) {
  const [draft, setDraft] = useState<SessionDraft>(() =>
    session ? sessionToDraft(session) : emptySession()
  );
  const [isSaving, setIsSaving] = useState(false);
  const addMutation = useAddProgramSession();
  const updateMutation = useUpdateProgramSession();
  const { toast } = useToast();

  const isEdit = !!session;

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
        estimatedDurationMin: draft.estimatedDurationMin,
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

  const dayName = DAY_NAMES[dayNumber - 1] || `Jour ${dayNumber}`;

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
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Type de séance</label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as typeof SESSION_TYPES[number] }))}
              >
                <SelectTrigger className="bg-background border-border capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {SESSION_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Durée (min)</label>
              <Input
                type="number"
                min={1}
                value={draft.estimatedDurationMin}
                onChange={(e) => setDraft((d) => ({ ...d, estimatedDurationMin: +e.target.value }))}
                className="bg-background border-border"
              />
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
                <span className="text-violet-400">Recovery</span> (×0.30, 2×12-15) seront créées automatiquement.
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

function SessionCell({ session, weekNumber, dayNumber, programId, onRefetch }: SessionCellProps) {
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
        <p className="text-[10px] font-mono text-muted-foreground capitalize mb-1.5">{session.type}</p>
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

export default function ProgramDetail() {
  const { id: programId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: program, isLoading, refetch } = useGetProgram(programId!, {
    query: { queryKey: ["/api/programs", programId], enabled: !!programId },
  });
  const { data: programs } = useGetPrograms();
  const programSummary = programs?.find((p) => p.id === programId);
  const athleteName = programSummary?.athleteName;
  const deleteProgramMutation = useDeleteProgram();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const handleDeleteProgram = async () => {
    try {
      await deleteProgramMutation.mutateAsync({ programId: programId! });
      toast({ title: "Programme supprimé" });
      navigate("/programs");
    } catch {
      toast({ title: "Échec de la suppression", variant: "destructive" });
    }
  };

  const duplicateWeek = useCallback(async (weekNum: number) => {
    if (!program || !programId) return;
    const weekSessions = program.sessions.filter((s) => s.weekNumber === weekNum);
    const nextWeek = program.durationWeeks + 1;
    try {
      await updateProgram(programId, {
        name: program.name,
        athleteId: program.athleteId,
        durationWeeks: nextWeek,
        startDate: program.startDate || undefined,
      });

      for (const s of weekSessions) {
        await addProgramSession(programId, {
          weekNumber: nextWeek,
          dayNumber: s.dayNumber,
          name: s.name,
          type: s.type as "strength" | "cardio" | "hybrid" | "mobility",
          estimatedDurationMin: s.estimatedDurationMin ?? undefined,
          coachNotes: s.coachNotes ?? undefined,
          variants: s.variants
            .filter((v) => v.exercises.length > 0)
            .map((v) => ({
              mode: v.mode as CreateSessionRequestVariantsItemMode,
              exercises: v.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
                sets: e.sets,
                reps: e.reps ?? undefined,
                loadKg: e.nominalLoadKg ?? undefined,
                restSeconds: e.restSeconds ?? undefined,
                coachCue: e.coachCue ?? undefined,
              })),
            })),
        });
      }

      toast({ title: `Semaine ${weekNum} dupliquée en semaine ${nextWeek}` });
      refetch();
    } catch {
      toast({ title: "Échec de la duplication", variant: "destructive" });
    }
  }, [program, programId, refetch, toast]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Programme introuvable.</p>
        <Link href="/programs">
          <Button variant="ghost" className="mt-4">Retour aux programmes</Button>
        </Link>
      </div>
    );
  }

  const sessionMap = new Map<string, SessionWithVariants>();
  program.sessions.forEach((s) => {
    sessionMap.set(`${s.weekNumber}-${s.dayNumber}`, s);
  });

  const weeks = Array.from({ length: program.durationWeeks }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/programs">
            <Button variant="ghost" size="icon" className="hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display text-white">{program.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-mono">
              <span>{program.durationWeeks} semaines</span>
              <span>•</span>
              <Link href={`/clients/${program.athleteId}`} className="hover:text-primary transition-colors">
                {athleteName ?? "Voir l'athlète"}
              </Link>
              {program.isActive && (
                <span className="text-primary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                  Actif
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Supprimer le programme
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {MODES.map((m) => {
          const style = MODE_STYLES[m];
          return (
            <div key={m} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${style.border} ${style.bg} ${style.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {style.label}
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground self-center ml-2">Chaque case peut avoir 4 variantes par mode</p>
      </div>

      <div className="space-y-4">
        {weeks.map((week) => (
          <div key={week} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-border">
              <h3 className="font-display text-lg text-white tracking-wider">SEMAINE {week}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-white gap-1.5 text-xs h-7"
                onClick={() => duplicateWeek(week)}
                title="Dupliquer cette semaine et l'ajouter à la fin"
              >
                <Copy className="w-3.5 h-3.5" /> Dupliquer la semaine
              </Button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_NAMES.map((dayLabel, idx) => {
                  const dayNumber = idx + 1;
                  const session = sessionMap.get(`${week}-${dayNumber}`);
                  return (
                    <div key={dayNumber} className="space-y-1">
                      <p className="text-center text-[10px] font-mono text-muted-foreground uppercase">{dayLabel}</p>
                      <SessionCell
                        session={session}
                        weekNumber={week}
                        dayNumber={dayNumber}
                        programId={programId!}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-white">Supprimer « {program.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le programme et toutes ses séances. Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteProgram}
              disabled={deleteProgramMutation.isPending}
            >
              {deleteProgramMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Supprimer le programme"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
