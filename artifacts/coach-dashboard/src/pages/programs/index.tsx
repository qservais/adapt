import { useTranslation } from "react-i18next";
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
  CreateSessionRequestBlocksItem,
  getTemplates,
  createTemplate,
  deleteTemplate,
  duplicateForAthlete,
  ProgramTemplate,
} from "@workspace/api-client-react";
import { useQueries, useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
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
  Eye,
  EyeOff,
  PlayCircle,
  AlertTriangle,
  LayoutTemplate,
  Trash2,
  UserCheck,
  FileText,
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
  athleteId: z.string().optional(),
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
  const { t } = useTranslation();
  const { data: clients } = useGetClients();
  const createMutation = useCreateProgram();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      athleteId: defaultAthleteId || undefined,
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
            {t("programs.dialog_create_title")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">{t("programs.label_program_name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("programs.name_placeholder")}
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
                  <FormLabel className="text-muted-foreground">{t("programs.label_assign_athlete")}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                    defaultValue={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder={t("programs.athlete_placeholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground italic">{t("programs.no_athlete")}</span>
                      </SelectItem>
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
                    <FormLabel className="text-muted-foreground">{t("programs.label_duration")}</FormLabel>
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
                    <FormLabel className="text-muted-foreground">{t("programs.label_start_date")}</FormLabel>
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
                t("programs.btn_create")
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

async function toggleProgramPreview(programId: string, enabled: boolean, allowStart?: boolean) {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`/api/programs/${programId}/preview`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled, allowStart }),
  });
  if (!res.ok) throw new Error("Server error");
}

function ProgramMiniCard({ prog }: { prog: ProgramSummary }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingPreview, setTogglingPreview] = useState(false);
  const [togglingAllowStart, setTogglingAllowStart] = useState(false);

  const handlePreviewToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTogglingPreview(true);
    try {
      const newEnabled = !prog.previewEnabled;
      await toggleProgramPreview(prog.id, newEnabled, newEnabled ? (prog.previewAllowStart ?? false) : false);
      toast({ title: prog.previewEnabled ? t("programs.preview_disabled_toast") : t("programs.preview_sent_toast") });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    } catch {
      toast({ title: t("library.delete_error_generic"), variant: "destructive" });
    } finally {
      setTogglingPreview(false);
    }
  };

  const handleAllowStartToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTogglingAllowStart(true);
    try {
      const newAllowStart = !(prog.previewAllowStart ?? false);
      await toggleProgramPreview(prog.id, true, newAllowStart);
      toast({ title: newAllowStart ? t("programs.athlete_can_start_toast") : t("programs.early_start_disabled_toast") });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    } catch {
      toast({ title: t("library.delete_error_generic"), variant: "destructive" });
    } finally {
      setTogglingAllowStart(false);
    }
  };

  return (
    <Link href={`/programs/${prog.id}`}>
      <div className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
            {prog.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {prog.durationWeeks} {t("programs.weeks_short")}
            </span>
            {prog.startDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(prog.startDate), "d MMM", { locale: fr })}
              </span>
            )}
            {typeof prog.sessionCount === "number" && prog.sessionCount === 0 ? (
              <span className="text-[10px] font-semibold text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {t("programs.no_sessions_warning")}
              </span>
            ) : typeof prog.sessionCount === "number" ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Dumbbell className="w-3 h-3" />
                {t("programs.sessions_count", { count: prog.sessionCount })}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <Dumbbell className="w-3 h-3 animate-pulse" />
                <span className="inline-block h-2 w-8 rounded bg-muted-foreground/20 animate-pulse" />
              </span>
            )}
            {prog.isActive && (
              <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                {t("programs.card_status_active")}
              </span>
            )}
            {prog.startsInFuture && (
              <span className="text-[10px] font-bold text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                {t("programs.card_status_future")}
              </span>
            )}
            {prog.previewEnabled && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                {t("programs.card_status_preview")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {prog.startsInFuture && prog.previewEnabled && (
            <button
              onClick={handleAllowStartToggle}
              disabled={togglingAllowStart}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                prog.previewAllowStart
                  ? "border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                  : "border-muted/30 text-muted-foreground bg-muted/10 hover:bg-muted/20"
              }`}
              title={prog.previewAllowStart ? t("programs.title_remove_start_permission") : t("programs.title_allow_athlete_start")}
            >
              {togglingAllowStart
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : prog.previewAllowStart
                  ? <><PlayCircle className="w-3 h-3" /> {t("programs.btn_start_ok")}</>
                  : <><PlayCircle className="w-3 h-3" /> {t("programs.btn_authorize")}</>
              }
            </button>
          )}
          <button
            onClick={handlePreviewToggle}
            disabled={togglingPreview}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
              prog.previewEnabled
                ? "border-primary/30 text-primary bg-primary/10 hover:bg-primary/20"
                : "border-muted/30 text-muted-foreground bg-muted/10 hover:bg-muted/20"
            }`}
            title={prog.previewEnabled ? t("programs.title_disable_preview") : t("programs.title_send_preview")}
          >
            {togglingPreview
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : prog.previewEnabled
                ? <><EyeOff className="w-3 h-3" /> {t("programs.btn_remove_preview")}</>
                : <><Eye className="w-3 h-3" /> {t("programs.btn_preview")}</>
            }
          </button>
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
  const { t } = useTranslation();
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
              {t("programs.programs_count", { count: programs.length })}
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
                {t("programs.btn_program_short")}
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
  athleteName?: string | null;
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
  const { t } = useTranslation();
  const [targetProgramId, setTargetProgramId] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [dayNumber, setDayNumber] = useState(1);
  const addMutation = useAddProgramSession();
  const { toast } = useToast();

  const targetProgram = programs.find((p) => p.id === targetProgramId);

  const handleCopy = async () => {
    if (!targetProgramId) return;
    try {
      const normalExercises = (block.variants.find(v => v.mode === "normal") ?? block.variants[0])?.exercises ?? [];

      let blocksPayload: CreateSessionRequestBlocksItem[];
      if (block.blocks && block.blocks.length > 0) {
        blocksPayload = block.blocks.map((b, bIdx) => ({
          type: b.type,
          orderIndex: bIdx,
          name: b.name ?? block.name,
          estimatedDurationMin: b.estimatedDurationMin ?? undefined,
          conditioningFormat: b.conditioningFormat ?? undefined,
          exercises: normalExercises
            .filter(e => e.blockId === b.id)
            .map((e, eIdx) => ({
              exerciseId: e.exerciseId,
              orderIndex: eIdx,
              sets: e.sets,
              reps: e.reps ?? undefined,
              loadKg: e.nominalLoadKg ?? undefined,
              restSeconds: e.restSeconds ?? undefined,
              coachCue: e.coachCue ?? undefined,
            })),
        }));
      } else {
        blocksPayload = [{
          type: block.type,
          orderIndex: 0,
          name: block.name,
          exercises: normalExercises.map((e, eIdx) => ({
            exerciseId: e.exerciseId,
            orderIndex: eIdx,
            sets: e.sets,
            reps: e.reps ?? undefined,
            loadKg: e.nominalLoadKg ?? undefined,
            restSeconds: e.restSeconds ?? undefined,
            coachCue: e.coachCue ?? undefined,
          })),
        }];
      }

      await addMutation.mutateAsync({
        programId: targetProgramId,
        data: {
          weekNumber,
          dayNumber,
          name: block.name,
          type: block.type as "strength" | "cardio" | "hybrid" | "mobility",
          estimatedDurationMin: block.estimatedDurationMin ?? undefined,
          coachNotes: block.coachNotes ?? undefined,
          blocks: blocksPayload,
        },
      });
      toast({ title: t("programs.block_copied_toast", { program: targetProgram?.name ?? "" }) });
      onClose();
    } catch {
      toast({ title: t("programs.copy_failed"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-widest text-white">
            {t("programs.reuse_dialog_title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-white/5 border border-border">
            <p className="text-sm font-semibold text-white">{block.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("programs.reuse_source", { athlete: block.athleteName, program: block.programName })}
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {t("programs.label_target_program")}
            </label>
            <Select value={targetProgramId} onValueChange={setTargetProgramId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder={t("programs.select_program_placeholder")} />
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
                {t("programs.label_week")}
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
                {t("programs.label_day")}
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
              {t("common.cancel")}
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
                  {t("programs.btn_copy")}
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
  const { t } = useTranslation();
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
            {t("programs.exercises_count", { count: exerciseCount })}
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
          {t("programs.btn_reuse")}
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
  const { t } = useTranslation();
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
            placeholder={t("programs.search_block_placeholder")}
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
            <SelectItem value="all">{t("programs.filter_all_types")}</SelectItem>
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
          <p className="text-sm">{t("programs.no_block_found")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filtered.map((block) => (
            <BlockCard key={`${block.programId}-${block.id}`} block={block} programs={programs} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        {t("programs.blocks_count", { count: filtered.length })} —{" "}
        {t("programs.blocks_total_suffix", { count: uniqueBlocks.length })}
        {uniqueBlocks.length !== allBlocks.length && (
          <> {t("programs.duplicates_hidden", { count: allBlocks.length - uniqueBlocks.length })}</>
        )}
      </p>
    </div>
  );
}

// ─── NEW TEMPLATE SCHEMA & COMPONENTS ────────────────────────────────────────

const createTemplateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  durationWeeks: z.coerce.number().min(1).max(52),
  description: z.string().optional(),
});

function NewTemplateDialog({
  trigger,
  onCreated,
}: {
  trigger: React.ReactNode;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs/templates"] });
      onCreated();
    },
  });

  const form = useForm<z.infer<typeof createTemplateFormSchema>>({
    resolver: zodResolver(createTemplateFormSchema),
    defaultValues: { name: "", durationWeeks: 4, description: "" },
  });

  const onSubmit = async (data: z.infer<typeof createTemplateFormSchema>) => {
    try {
      await createMutation.mutateAsync({ name: data.name, durationWeeks: data.durationWeeks, description: data.description || undefined });
      setOpen(false);
      form.reset();
      toast({ title: t("programs.template_created_toast") });
    } catch {
      toast({ title: t("programs.template_create_error"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display tracking-widest text-white">
            {t("programs.dialog_new_template_title")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">{t("programs.label_template_name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("programs.template_name_placeholder")} className="bg-background border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">{t("programs.label_description_optional")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("programs.template_description_placeholder")} className="bg-background border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationWeeks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">{t("programs.label_duration")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={52} className="bg-background border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("programs.btn_create_template")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ApplyTemplateModal({
  template,
  open,
  onClose,
}: {
  template: ProgramTemplate;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: clients } = useGetClients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [athleteId, setAthleteId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]!);
  const applyMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: { athleteId: string; startDate?: string } }) =>
      duplicateForAthlete(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
  });

  const handleApply = async () => {
    if (!athleteId) return;
    try {
      const result = await applyMutation.mutateAsync({ templateId: template.id, data: { athleteId, startDate } });
      toast({ title: t("programs.template_program_created_toast", { name: result.name, athlete: result.athleteName }) });
      onClose();
    } catch {
      toast({ title: t("programs.apply_template_error"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-widest text-white">
            {t("programs.apply_template_title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {t("programs.apply_template_meta", { name: template.name, weeks: template.durationWeeks, sessions: template.sessionCount })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("programs.label_athlete")}</label>
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder={t("programs.athlete_placeholder_dots")} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("programs.label_start_date")}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="border-border flex-1" onClick={onClose}>{t("common.cancel")}</Button>
            <Button
              className="flex-1 bg-primary text-black hover:bg-primary/90"
              onClick={handleApply}
              disabled={!athleteId || applyMutation.isPending}
            >
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4 mr-2" />{t("programs.btn_apply")}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onDeleted }: { template: ProgramTemplate; onDeleted: () => void }) {
  const { t } = useTranslation();
  const [applyOpen, setApplyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useMutation({
    mutationFn: () => deleteTemplate(template.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs/templates"] });
      onDeleted();
    },
  });

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast({ title: t("programs.template_deleted_toast") });
      setConfirmDelete(false);
    } catch {
      toast({ title: t("programs.template_delete_error"), variant: "destructive" });
    }
  };

  return (
    <>
      <div className="group bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/programs/${template.id}`}>
              <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors cursor-pointer">
                {template.name}
              </p>
            </Link>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{template.description}</p>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-accent/30 text-accent bg-accent/10">
            {t("programs.card_template_label")}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.durationWeeks} {t("programs.weeks_short")}
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3" />
            {t("programs.sessions_count", { count: template.sessionCount })}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-primary text-black hover:bg-primary/90 text-xs h-8"
            onClick={() => setApplyOpen(true)}
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            {t("programs.btn_use_template")}
          </Button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg border border-border hover:border-destructive/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {applyOpen && (
        <ApplyTemplateModal template={template} open={applyOpen} onClose={() => setApplyOpen(false)} />
      )}

      {confirmDelete && (
        <Dialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">{t("programs.delete_template_title")}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t("programs.delete_template_desc", { name: template.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" className="border-border" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function ModelesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ["/api/programs/templates"],
    queryFn: getTemplates,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const allTemplates = templates || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("programs.templates_count", { count: allTemplates.length })}
        </p>
        <NewTemplateDialog
          onCreated={() => refetch()}
          trigger={
            <Button size="sm" className="bg-primary text-black hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1.5" />
              {t("programs.btn_new_template")}
            </Button>
          }
        />
      </div>

      {allTemplates.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
          <LayoutTemplate className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">{t("programs.no_templates_title")}</p>
          <p className="text-xs mt-1 opacity-70">{t("programs.no_templates_hint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {allTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onDeleted={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── END TEMPLATE COMPONENTS ──────────────────────────────────────────────────

export default function ProgramsList() {
  const { t } = useTranslation();
  const { data: programs, isLoading, refetch } = useGetPrograms();
  const linkMutation = useCoachLink();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"athletes" | "bibliotheque" | "modeles">("athletes");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  const handleLink = async () => {
    setLinkError("");
    setLinkSuccess("");
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      setLinkError(t("programs.link_error_length"));
      return;
    }
    try {
      const res = await linkMutation.mutateAsync({ data: { inviteCode: code } });
      setLinkSuccess(res.message ?? t("programs.link_success_default"));
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/coach/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      refetch();
    } catch (err: unknown) {
      const serverMsg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      setLinkError(serverMsg || t("programs.link_error_invalid"));
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
    const key = prog.athleteId ?? "__no_athlete__";
    if (!acc[key]) {
      acc[key] = { athleteName: prog.athleteName ?? t("programs.no_athlete"), programs: [] };
    }
    acc[key]!.programs.push(prog);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display text-white">{t("programs.page_title_main")}</h1>
          <p className="text-muted-foreground text-sm truncate">
            {t("programs.page_subtitle_main")}
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
            {t("programs.btn_add_athlete")}
          </Button>
          <NewProgramDialog
            onCreated={refetch}
            trigger={
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> {t("programs.btn_new_program")}
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
              {t("programs.btn_add_athlete")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {t("programs.dialog_add_athlete_desc")}
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
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              className="bg-primary text-black hover:bg-primary/90"
              disabled={linkMutation.isPending || inviteCode.trim().length !== 6}
              onClick={handleLink}
            >
              {linkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("programs.btn_link_athlete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-1 p-1 bg-card border border-border rounded-xl w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setTab("athletes")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
            tab === "athletes"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-4 h-4" />
          {t("programs.tab_by_athlete")}
        </button>
        <button
          onClick={() => setTab("bibliotheque")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
            tab === "bibliotheque"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {t("programs.tab_blocks_library")}
        </button>
        <button
          onClick={() => setTab("modeles")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
            tab === "modeles"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          {t("programs.tab_library")}
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
              {t("programs.no_program_created")}
            </div>
          )}
        </div>
      )}

      {tab === "bibliotheque" && <BibliothequeTab programs={allPrograms} />}

      {tab === "modeles" && <ModelesTab />}
    </div>
  );
}
