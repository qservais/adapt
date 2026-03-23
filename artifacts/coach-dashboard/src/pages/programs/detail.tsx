import { useState, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetProgram,
  useGetPrograms,
  useDeleteProgram,
  useAddProgramSession,
  useDeleteProgramSession,
  addProgramSession,
  updateProgram,
  CreateSessionRequestBlocksItem,
  SessionWithVariants,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Trash2,
  Copy,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Clock,
  Dumbbell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MODE_STYLES,
  MODES,
  DAY_NAMES,
  SESSION_TYPE_LABELS,
  SessionModal,
} from "@/components/program-editor";

function sessionToBlocksPayload(session: SessionWithVariants): CreateSessionRequestBlocksItem[] {
  const normalVariant = session.variants.find((v) => v.mode === "normal");
  const exercises = normalVariant?.exercises ?? [];
  const exByBlock = new Map<string, typeof exercises>();
  const noBlockExercises: typeof exercises = [];
  for (const ex of exercises) {
    if (ex.blockId) {
      if (!exByBlock.has(ex.blockId)) exByBlock.set(ex.blockId, []);
      exByBlock.get(ex.blockId)!.push(ex);
    } else {
      noBlockExercises.push(ex);
    }
  }
  if (session.blocks && session.blocks.length > 0) {
    return session.blocks.map((b, bIdx) => ({
      type: b.type,
      orderIndex: bIdx,
      name: b.name ?? "",
      estimatedDurationMin: b.estimatedDurationMin ?? undefined,
      conditioningFormat: b.conditioningFormat ?? undefined,
      exercises: (exByBlock.get(b.id) ?? []).map((ex, eIdx) => ({
        exerciseId: ex.exerciseId,
        orderIndex: eIdx,
        sets: ex.sets,
        reps: ex.reps ?? undefined,
        loadKg: ex.nominalLoadKg ?? undefined,
        restSeconds: ex.restSeconds ?? undefined,
        coachCue: ex.coachCue ?? undefined,
        tempo: ex.tempo ?? undefined,
        supersetGroup: ex.supersetGroup ?? undefined,
        supersetLabel: ex.supersetLabel ?? undefined,
      })),
    }));
  }
  if (noBlockExercises.length > 0) {
    return [{
      type: "strength",
      orderIndex: 0,
      name: "Principal",
      exercises: noBlockExercises.map((ex, eIdx) => ({
        exerciseId: ex.exerciseId,
        orderIndex: eIdx,
        sets: ex.sets,
        reps: ex.reps ?? undefined,
        loadKg: ex.nominalLoadKg ?? undefined,
        restSeconds: ex.restSeconds ?? undefined,
        coachCue: ex.coachCue ?? undefined,
        tempo: ex.tempo ?? undefined,
        supersetGroup: ex.supersetGroup ?? undefined,
        supersetLabel: ex.supersetLabel ?? undefined,
      })),
    }];
  }
  return [];
}

function DuplicateDialog({
  session,
  programId,
  programName,
  programAthleteId,
  durationWeeks,
  open,
  onClose,
  onSaved,
}: {
  session: SessionWithVariants;
  programId: string;
  programName: string;
  programAthleteId: string;
  durationWeeks: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [targetWeek, setTargetWeek] = useState(session.weekNumber);
  const [targetDay, setTargetDay] = useState(session.dayNumber);
  const addMutation = useAddProgramSession();
  const { toast } = useToast();

  const handleDuplicate = async () => {
    try {
      if (targetWeek > durationWeeks) {
        await updateProgram(programId, {
          name: programName,
          athleteId: programAthleteId,
          durationWeeks: targetWeek,
        });
      }
      await addMutation.mutateAsync({
        programId,
        data: {
          weekNumber: targetWeek,
          dayNumber: targetDay,
          name: session.name,
          type: session.type as "strength" | "cardio" | "hybrid" | "mobility" | "athletic_development" | "running" | "conditioning",
          estimatedDurationMin: session.estimatedDurationMin ?? undefined,
          coachNotes: session.coachNotes ?? undefined,
          blocks: sessionToBlocksPayload(session),
        },
      });
      toast({ title: `« ${session.name} » → S${targetWeek} / ${DAY_NAMES[targetDay - 1]}` });
      onSaved();
    } catch {
      toast({ title: "Échec de la duplication", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-widest text-white">
            DUPLIQUER LA SÉANCE
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-white/5 border border-border">
            <p className="text-sm font-semibold text-white">{session.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Source : S{session.weekNumber} / {DAY_NAMES[session.dayNumber - 1]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Semaine cible
              </label>
              <Input
                type="number"
                min={1}
                max={durationWeeks + 10}
                value={targetWeek}
                onChange={(e) => setTargetWeek(Math.max(1, +e.target.value))}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Jour cible
              </label>
              <Select value={String(targetDay)} onValueChange={(v) => setTargetDay(+v)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {DAY_NAMES.map((d, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="border-border flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleDuplicate}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorSessionCard({
  session,
  programId,
  programName,
  programAthleteId,
  durationWeeks,
  onRefetch,
}: {
  session: SessionWithVariants;
  programId: string;
  programName: string;
  programAthleteId: string;
  durationWeeks: number;
  onRefetch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteProgramSession();
  const { toast } = useToast();

  const normalVariant = session.variants.find((v) => v.mode === "normal");
  const exercises = normalVariant?.exercises ?? [];

  const modeHas = session.variants.reduce<Record<string, boolean>>((acc, v) => {
    if (v.exercises.length > 0) acc[v.mode] = true;
    return acc;
  }, {});

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ programId, sessionId: session.id });
      toast({ title: "Séance supprimée" });
      onRefetch();
    } catch {
      toast({ title: "Échec de la suppression", variant: "destructive" });
    }
  };

  return (
    <>
      <div
        className={`group w-full rounded-lg border bg-card transition-all relative overflow-hidden ${
          expanded ? "border-white/20" : "border-border hover:border-white/20"
        }`}
      >
        <div className="p-2">
          <div className="flex items-start justify-between gap-1 mb-1">
            <p className="text-xs font-semibold text-white leading-tight flex-1 truncate">
              {session.name}
            </p>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setDupOpen(true)}
                className="p-1 rounded hover:bg-primary/20 transition-colors"
                title="Dupliquer"
              >
                <Copy className="w-3 h-3 text-primary" />
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Modifier"
              >
                <Pencil className="w-3 h-3 text-white" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="p-1 rounded hover:bg-destructive/20 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          </div>

          <p className="text-[10px] font-mono text-muted-foreground capitalize mb-1.5">
            {SESSION_TYPE_LABELS[session.type] ?? session.type}
          </p>

          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-0.5 flex-wrap">
              {MODES.filter((m) => modeHas[m]).map((m) => (
                <span
                  key={m}
                  className={`text-[8px] uppercase font-bold px-1 py-0.5 rounded-sm ${MODE_STYLES[m].bg} ${MODE_STYLES[m].color}`}
                >
                  {m[0]}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {session.estimatedDurationMin && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {session.estimatedDurationMin}m
                </span>
              )}
              {exercises.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  title={expanded ? "Réduire" : "Voir les exercices"}
                >
                  {expanded ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {expanded && exercises.length > 0 && (
          <div className="border-t border-border px-2 pb-2 pt-1.5 space-y-1">
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Dumbbell className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-white truncate flex-1">{ex.exerciseName}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {ex.sets}×{ex.reps || "—"}
                  {ex.nominalLoadKg ? ` @${ex.nominalLoadKg}kg` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SessionModal
        programId={programId}
        weekNumber={session.weekNumber}
        dayNumber={session.dayNumber}
        session={session}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          onRefetch();
        }}
      />

      <DuplicateDialog
        session={session}
        programId={programId}
        programName={programName}
        programAthleteId={programAthleteId}
        durationWeeks={durationWeeks}
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        onSaved={() => {
          setDupOpen(false);
          onRefetch();
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-white">
              Supprimer la séance ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement « {session.name} » du programme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddSessionButton({
  programId,
  weekNumber,
  dayNumber,
  onRefetch,
}: {
  programId: string;
  weekNumber: number;
  dayNumber: number;
  onRefetch: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-9 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group flex items-center justify-center"
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>
      {open && (
        <SessionModal
          programId={programId}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          open={open}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onRefetch();
          }}
        />
      )}
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
  const [currentWeek, setCurrentWeek] = useState(1);
  const { toast } = useToast();

  const totalWeeks = program?.durationWeeks ?? 1;
  const safeCurrentWeek = Math.min(Math.max(currentWeek, 1), totalWeeks);

  const sessionMap = useMemo(() => {
    if (!program) return new Map<string, SessionWithVariants[]>();
    const map = new Map<string, SessionWithVariants[]>();
    for (const s of program.sessions) {
      const key = `${s.weekNumber}-${s.dayNumber}`;
      const existing = map.get(key) ?? [];
      existing.push(s);
      map.set(key, existing);
    }
    return map;
  }, [program]);

  const handleDeleteProgram = async () => {
    try {
      await deleteProgramMutation.mutateAsync({ programId: programId! });
      toast({ title: "Programme supprimé" });
      navigate("/programs");
    } catch {
      toast({ title: "Échec de la suppression", variant: "destructive" });
    }
  };

  const handleAddWeek = useCallback(async () => {
    if (!program || !programId) return;
    const nextWeek = totalWeeks + 1;
    try {
      await updateProgram(programId, {
        name: program.name,
        athleteId: program.athleteId,
        durationWeeks: nextWeek,
        startDate: program.startDate || undefined,
      });
      toast({ title: `Semaine ${nextWeek} ajoutée` });
      setCurrentWeek(nextWeek);
      refetch();
    } catch {
      toast({ title: "Échec", variant: "destructive" });
    }
  }, [program, programId, totalWeeks, refetch, toast]);

  const duplicateWeek = useCallback(async () => {
    if (!program || !programId) return;
    const weekSessions = program.sessions.filter((s) => s.weekNumber === safeCurrentWeek);
    const nextWeek = totalWeeks + 1;
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
          type: s.type as "strength" | "cardio" | "hybrid" | "mobility" | "athletic_development" | "running" | "conditioning",
          estimatedDurationMin: s.estimatedDurationMin ?? undefined,
          coachNotes: s.coachNotes ?? undefined,
          blocks: sessionToBlocksPayload(s),
        });
      }
      toast({ title: `Semaine ${safeCurrentWeek} → S${nextWeek}` });
      setCurrentWeek(nextWeek);
      refetch();
    } catch {
      toast({ title: "Échec de la duplication", variant: "destructive" });
    }
  }, [program, programId, safeCurrentWeek, totalWeeks, refetch, toast]);

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
          <Button variant="ghost" className="mt-4">
            Retour aux programmes
          </Button>
        </Link>
      </div>
    );
  }

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

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
              <span>{totalWeeks} semaines</span>
              <span>•</span>
              <Link
                href={`/clients/${program.athleteId}`}
                className="hover:text-primary transition-colors"
              >
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
            <div
              key={m}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${style.border} ${style.bg} ${style.color}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {style.label}
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground self-center ml-2">
          Plusieurs séances possibles par jour — cliquer ▿ pour voir les exercices
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-border gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/5"
              onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
              disabled={safeCurrentWeek <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Select
              value={String(safeCurrentWeek)}
              onValueChange={(v) => setCurrentWeek(+v)}
            >
              <SelectTrigger className="bg-background border-border h-8 w-36 font-display tracking-wider text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-56 overflow-y-auto">
                {weeks.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    SEMAINE {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/5"
              onClick={() => setCurrentWeek((w) => Math.min(totalWeeks, w + 1))}
              disabled={safeCurrentWeek >= totalWeeks}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-white gap-1.5 text-xs h-7"
              onClick={duplicateWeek}
              title="Copier cette semaine à la fin du programme"
            >
              <Copy className="w-3.5 h-3.5" /> Dupliquer S{safeCurrentWeek}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary gap-1.5 text-xs h-7"
              onClick={handleAddWeek}
              title="Ajouter une semaine vide à la fin"
            >
              <Plus className="w-3.5 h-3.5" /> Semaine vide
            </Button>
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((dayLabel, idx) => {
              const dayNumber = idx + 1;
              const daySessions = sessionMap.get(`${safeCurrentWeek}-${dayNumber}`) ?? [];
              return (
                <div key={dayNumber} className="space-y-1.5">
                  <p className="text-center text-[10px] font-mono text-muted-foreground uppercase">
                    {dayLabel}
                  </p>
                  {daySessions.map((session) => (
                    <EditorSessionCard
                      key={session.id}
                      session={session}
                      programId={programId!}
                      programName={program.name}
                      programAthleteId={program.athleteId}
                      durationWeeks={totalWeeks}
                      onRefetch={refetch}
                    />
                  ))}
                  <AddSessionButton
                    programId={programId!}
                    weekNumber={safeCurrentWeek}
                    dayNumber={dayNumber}
                    onRefetch={refetch}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-white">
              Supprimer « {program.name} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le programme et toutes ses séances.
              Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteProgram}
              disabled={deleteProgramMutation.isPending}
            >
              {deleteProgramMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Supprimer le programme"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
