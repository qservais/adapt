import { useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetProgram,
  useGetPrograms,
  useDeleteProgram,
  addProgramSession,
  updateProgram,
  CreateSessionRequestVariantsItemMode,
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
import { ArrowLeft, Trash2, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MODE_STYLES,
  MODES,
  DAY_NAMES,
  SessionCell,
} from "@/components/program-editor";

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

  const sessionMap = new Map<string, typeof program.sessions[0]>();
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
