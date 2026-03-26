import { useState } from "react";
import { Link } from "wouter";
import {
  useGetPrograms,
  useCreateProgram,
  useGetClients,
  useAddProgramSession,
  useGetExercises,
  useCoachLink,
  getProgram,
  ProgramSummary,
  ProgramDetail,
  SessionWithVariants,
  ExerciseData,
  CreateSessionRequestVariantsItemMode,
} from "@workspace/api-client-react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  Calendar,
  User,
  Clock,
  Dumbbell,
  Search,
  ChevronRight,
  BookOpen,
  Users,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  UserPlus,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const SESSION_TYPES = ["strength", "cardio", "hybrid", "mobility"] as const;
const TYPE_LABELS: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hybrid: "Hybride",
  mobility: "Mobilité",
};
const TYPE_COLORS: Record<string, string> = {
  strength: "text-primary bg-primary/10 border-primary/30",
  cardio: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  hybrid: "text-secondary bg-secondary/10 border-secondary/30",
  mobility: "text-violet-400 bg-violet-400/10 border-violet-400/30",
};
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const createSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  athleteId: z.string().min(1, "L'athlète est requis"),
  durationWeeks: z.coerce.number().min(1).max(52),
  startDate: z.string().optional(),
});

function NewProgramDialog({
  defaultAthleteId,
  trigger,
  onCreated,
}: {
  defaultAthleteId?: string;
  trigger: React.ReactNode;
  onCreated: () => void;
}) {
  const { data: clients } = useGetClients();
  const createMutation = useCreateProgram();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      athleteId: defaultAthleteId || "",
      durationWeeks: 4,
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: z.infer<typeof createSchema>) => {
    try {
      await createMutation.mutateAsync({ data });
      setOpen(false);
      form.reset();
      onCreated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display tracking-widest text-white">
            CRÉER UN PROGRAMME
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">Nom du programme</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Préparation hors-saison..."
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">Assigner un athlète</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Choisir un athlète" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationWeeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Durée (semaines)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} className="bg-background border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Date de début</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Créer le programme"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProgramMiniCard({ prog }: { prog: ProgramSummary }) {
  return (
    <Link href={`/programs/${prog.id}`}>
      <div className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
            {prog.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {prog.durationWeeks} sem.
            </span>
            {prog.startDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(prog.startDate), "d MMM", { locale: fr })}
              </span>
            )}
            {prog.isActive && (
              <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                ACTIF
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

function AthleteSection({
  athleteId,
  athleteName,
  programs,
  onCreated,
}: {
  athleteId: string;
  athleteName: string;
  programs: ProgramSummary[];
  onCreated: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const initials = athleteName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs font-mono shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{athleteName}</p>
            <p className="text-xs text-muted-foreground">
              {programs.length} programme{programs.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NewProgramDialog
            defaultAthleteId={athleteId}
            onCreated={onCreated}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Programme
              </Button>
            }
          />
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
          {programs.map((prog) => (
            <ProgramMiniCard key={prog.id} prog={prog} />
          ))}
        </div>
      )}
    </div>
  );
}

interface BlockSession extends SessionWithVariants {
  programId: string;
  programName: string;
  athleteName: string;
}

function ReutiliserModal({
  block,
  programs,
  open,
  onClose,
}: {
  block: BlockSession;
  programs: ProgramSummary[];
  open: boolean;
  onClose: () => void;
}) {
  const [targetProgramId, setTargetProgramId] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayNumber, setDayNumber] = useState(1);
  const addMutation = useAddProgramSession();
  const { toast } = useToast();

  const targetProgram = programs.find((p) => p.id === targetProgramId);

  const handleCopy = async () => {
    if (!targetProgramId) return;
    try {
      await addMutation.mutateAsync({
        programId: targetProgramId,
        data: {
          weekNumber,
          dayNumber,
          name: block.name,
          type: block.type as "strength" | "cardio" | "hybrid" | "mobility",
          estimatedDurationMin: block.estimatedDurationMin ?? undefined,
          coachNotes: block.coachNotes ?? undefined,
          variants: block.variants
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
        },
      });
      toast({ title: `Bloc copié dans « ${targetProgram?.name} »` });
      onClose();
    } catch {
      toast({ title: "Échec de la copie", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-widest text-white">
            RÉUTILISER CE BLOC
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-white/5 border border-border">
            <p className="text-sm font-semibold text-white">{block.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Source : {block.athleteName} — {block.programName}
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Programme cible
            </label>
            <Select value={targetProgramId} onValueChange={setTargetProgramId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Choisir un programme..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.athleteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Semaine
              </label>
              <Input
                type="number"
                min={1}
                max={targetProgram?.durationWeeks || 52}
                value={weekNumber}
                onChange={(e) => setWeekNumber(+e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Jour
              </label>
              <Select value={String(dayNumber)} onValueChange={(v) => setDayNumber(+v)}>
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
              className="flex-1 bg-primary text-black hover:bg-primary/90"
              onClick={handleCopy}
              disabled={!targetProgramId || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlockCard({
  block,
  programs,
}: {
  block: BlockSession;
  programs: ProgramSummary[];
}) {
  const [reutiliserOpen, setReutiliserOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const normalVariant = block.variants.find((v) => v.mode === "normal");
  const exercises = normalVariant?.exercises ?? [];
  const exerciseCount = exercises.length;
  const typeStyle = TYPE_COLORS[block.type] || "text-muted-foreground bg-white/5 border-white/10";
  const typeLabel = TYPE_LABELS[block.type] || block.type;

  return (
    <>
      <div className="group bg-card border border-border rounded-xl p-4 hover:border-white/20 transition-all flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{block.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" />
              {block.athleteName}
            </p>
          </div>
          <span
            className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${typeStyle}`}
          >
            {typeLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 text-xs text-muted-foreground w-full text-left hover:text-white/80 transition-colors"
        >
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3" />
            {exerciseCount} exercice{exerciseCount > 1 ? "s" : ""}
          </span>
          {block.estimatedDurationMin && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {block.estimatedDurationMin} min
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[80px]">
              {block.programName}
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
          </span>
        </button>

        {expanded && exercises.length > 0 && (
          <div className="border-t border-border pt-2 space-y-1.5">
            {exercises.map((ex, i) => (
              <div key={ex.id || i} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground/50 font-mono w-4 text-right shrink-0">{i + 1}.</span>
                <span className="text-white/90 truncate flex-1">{ex.exerciseName}</span>
                {ex.sets > 0 && (
                  <span className="text-muted-foreground font-mono shrink-0">
                    {ex.sets}×{ex.reps ?? "?"}
                  </span>
                )}
                {ex.nominalLoadKg != null && ex.nominalLoadKg > 0 && (
                  <span className="text-primary/70 font-mono shrink-0">
                    {ex.nominalLoadKg}kg
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setReutiliserOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all"
        >
          <Copy className="w-3.5 h-3.5" />
          Réutiliser
        </button>
      </div>

      {reutiliserOpen && (
        <ReutiliserModal
          block={block}
          programs={programs}
          open={reutiliserOpen}
          onClose={() => setReutiliserOpen(false)}
        />
      )}
    </>
  );
}

function BibliothequeTab({ programs }: { programs: ProgramSummary[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const programDetails = useQueries({
    queries: programs.map((p) => ({
      queryKey: ["/api/programs", p.id, "detail"],
      queryFn: () => getProgram(p.id),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const isLoading = programDetails.some((q) => q.isLoading);

  const allBlocks: BlockSession[] = programDetails.flatMap((q, i) => {
    const detail = q.data as ProgramDetail | undefined;
    if (!detail) return [];
    const prog = programs[i]!;
    return detail.sessions.map((s) => ({
      ...s,
      programId: prog.id,
      programName: prog.name,
      athleteName: prog.athleteName,
    }));
  });

  const uniqueBlocks = allBlocks.filter(
    (block, idx, arr) =>
      arr.findIndex((b) => b.name === block.name && b.type === block.type) === idx
  );

  const filtered = uniqueBlocks.filter((b) => {
    const matchSearch = search === "" || b.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || b.type === typeFilter;
    return matchSearch && matchType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bloc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              onClick={() => setSearch("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Tous les types</SelectItem>
            {SESSION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun bloc trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((block) => (
            <BlockCard key={`${block.programId}-${block.id}`} block={block} programs={programs} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        {filtered.length} bloc{filtered.length > 1 ? "s" : ""} —{" "}
        {uniqueBlocks.length} total
        {uniqueBlocks.length !== allBlocks.length && (
          <> ({allBlocks.length - uniqueBlocks.length} doublons masqués)</>
        )}
      </p>
    </div>
  );
}

export default function ProgramsList() {
  const { data: programs, isLoading, refetch } = useGetPrograms();
  const linkMutation = useCoachLink();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"athletes" | "bibliotheque">("athletes");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  const handleLink = async () => {
    setLinkError("");
    setLinkSuccess("");
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      setLinkError("Entrez les 6 caractères du code d'invitation de l'athlète.");
      return;
    }
    try {
      const res = await linkMutation.mutateAsync({ data: { inviteCode: code } });
      setLinkSuccess(res.message ?? "Athlète lié avec succès !");
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/coach/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      refetch();
    } catch (err: unknown) {
      const serverMsg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      setLinkError(serverMsg || "Code invalide ou athlète introuvable.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const allPrograms = programs || [];

  const byAthlete = allPrograms.reduce<
    Record<string, { athleteName: string; programs: ProgramSummary[] }>
  >((acc, prog) => {
    if (!acc[prog.athleteId]) {
      acc[prog.athleteId] = { athleteName: prog.athleteName, programs: [] };
    }
    acc[prog.athleteId]!.programs.push(prog);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display text-white">PROGRAMMES D'ENTRAÎNEMENT</h1>
          <p className="text-muted-foreground text-sm truncate">
            Gérez les protocoles par athlète et votre bibliothèque de blocs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            onClick={() => {
              setInviteCode("");
              setLinkError("");
              setLinkSuccess("");
              setLinkDialogOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un athlète
          </Button>
          <NewProgramDialog
            onCreated={refetch}
            trigger={
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Nouveau programme
              </Button>
            }
          />
        </div>
      </div>

      {/* Add athlete dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={o => { if (!o) { setLinkDialogOpen(false); setInviteCode(""); setLinkError(""); setLinkSuccess(""); } }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-display text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Ajouter un athlète
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Entrez le code d'invitation de l'athlète (6 caractères) pour le lier à votre espace coach.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              placeholder="CODE6C"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="bg-background border-border text-white uppercase tracking-widest font-mono text-center text-lg"
              onKeyDown={e => e.key === "Enter" && handleLink()}
            />
            {linkError && <p className="text-xs text-destructive">{linkError}</p>}
            {linkSuccess && (
              <div className="flex items-center gap-2 text-primary text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {linkSuccess}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={() => setLinkDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              className="bg-primary text-black hover:bg-primary/90"
              disabled={linkMutation.isPending || inviteCode.trim().length !== 6}
              onClick={handleLink}
            >
              {linkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lier l'athlète"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-1 p-1 bg-card border border-border rounded-xl w-fit">
        <button
          onClick={() => setTab("athletes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "athletes"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-4 h-4" />
          Par athlète
        </button>
        <button
          onClick={() => setTab("bibliotheque")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "bibliotheque"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Bibliothèque de blocs
        </button>
      </div>

      {tab === "athletes" && (
        <div className="space-y-4">
          {Object.entries(byAthlete).map(([athleteId, { athleteName, programs: aps }]) => (
            <AthleteSection
              key={athleteId}
              athleteId={athleteId}
              athleteName={athleteName}
              programs={aps}
              onCreated={refetch}
            />
          ))}
          {allPrograms.length === 0 && (
            <div className="py-12 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
              Aucun programme créé. Créez-en un pour commencer.
            </div>
          )}
        </div>
      )}

      {tab === "bibliotheque" && <BibliothequeTab programs={allPrograms} />}
    </div>
  );
}
