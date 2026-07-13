import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useAddProgramSession,
  useUpdateProgramSession,
  useDeleteProgramSession,
  useGetProgram,
  useGetExercises,
  SessionWithVariants,
  ExerciseData,
  CreateSessionRequest,
  CreateSessionRequestBlocksItem,
} from "@workspace/api-client-react";
import {
  Sparkles, Plus, Trash2, Loader2, Dumbbell, Search, X,
  ChevronDown, ChevronUp, Clock, Flame, Zap, Activity,
  Shield, Wind, GripVertical, Link as LinkIcon,
  Heart, Timer, PersonStanding, Radius, Crosshair, Layers,
  Gauge, BarChart2, Copy, FileText, FlaskConical,
} from "lucide-react";
import { SessionImportModal } from "./session-import-modal";
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
import { cn } from "@/components/ui/mode-badge";

export const MODE_STYLES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  performance: { label: "Performance", color: "text-primary", border: "border-primary", bg: "bg-primary/10" },
  normal: { label: "Normal", color: "text-secondary", border: "border-secondary", bg: "bg-secondary/10" },
  adapt: { label: "Adapt", color: "text-accent", border: "border-accent", bg: "bg-accent/10" },
  recovery: { label: "Récupération", color: "text-violet-400", border: "border-violet-400", bg: "bg-violet-400/10" },
};

export const SESSION_TYPES = [
  "strength", "cardio", "hybrid", "mobility",
  "athletic_development", "running", "conditioning",
  "hypertrophie", "coordination", "technique", "endurance",
] as const;

export const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hybrid: "Hybride",
  mobility: "Mobilité",
  athletic_development: "Dév. athlétique",
  running: "Course",
  conditioning: "Conditionnement",
  hypertrophie: "Hypertrophie",
  coordination: "Coordination",
  technique: "Technique",
  endurance: "Endurance",
};

export const SESSION_TYPE_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  strength:            { dot: "bg-[#00F0FF]",  text: "text-[#00F0FF]",  bg: "bg-[#00F0FF]/10" },
  cardio:              { dot: "bg-[#FF6B6B]",  text: "text-[#FF6B6B]",  bg: "bg-[#FF6B6B]/10" },
  hybrid:              { dot: "bg-[#A855F7]",  text: "text-[#A855F7]",  bg: "bg-[#A855F7]/10" },
  mobility:            { dot: "bg-[#00F5A0]",  text: "text-[#00F5A0]",  bg: "bg-[#00F5A0]/10" },
  athletic_development:{ dot: "bg-[#FFB800]",  text: "text-[#FFB800]",  bg: "bg-[#FFB800]/10" },
  running:             { dot: "bg-[#FF8C42]",  text: "text-[#FF8C42]",  bg: "bg-[#FF8C42]/10" },
  conditioning:        { dot: "bg-[#EC4899]",  text: "text-[#EC4899]",  bg: "bg-[#EC4899]/10" },
  hypertrophie:        { dot: "bg-[#3B82F6]",  text: "text-[#3B82F6]",  bg: "bg-[#3B82F6]/10" },
  coordination:        { dot: "bg-[#10B981]",  text: "text-[#10B981]",  bg: "bg-[#10B981]/10" },
  technique:           { dot: "bg-[#F59E0B]",  text: "text-[#F59E0B]",  bg: "bg-[#F59E0B]/10" },
  endurance:           { dot: "bg-[#EF4444]",  text: "text-[#EF4444]",  bg: "bg-[#EF4444]/10" },
};

export const SESSION_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  strength:            Dumbbell,
  cardio:              Heart,
  hybrid:              Zap,
  mobility:            Wind,
  athletic_development:Flame,
  running:             PersonStanding,
  conditioning:        Activity,
  hypertrophie:        Dumbbell,
  coordination:        Activity,
  technique:           Shield,
  endurance:           Heart,
};

export const MODES = ["performance", "normal", "adapt", "recovery"] as const;
export const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const BLOCK_TYPES = [
  "warm_up", "strength", "power", "conditioning", "core", "cool_down",
  "mobility", "activation", "technique", "plyometric", "hiit",
] as const;

export type BlockType = typeof BLOCK_TYPES[number];

export const BLOCK_TYPE_META: Record<BlockType, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  warm_up:       { label: "Échauffement",  color: "text-[#FFB800]",  bg: "bg-[#FFB800]/10",  border: "border-[#FFB800]/30", icon: Flame },
  strength:      { label: "Force",          color: "text-[#00F0FF]",  bg: "bg-[#00F0FF]/10",  border: "border-[#00F0FF]/30", icon: Dumbbell },
  power:         { label: "Puissance",      color: "text-[#A855F7]",  bg: "bg-[#A855F7]/10",  border: "border-[#A855F7]/30", icon: Zap },
  conditioning:  { label: "Conditioning",   color: "text-[#EF4444]",  bg: "bg-[#EF4444]/10",  border: "border-[#EF4444]/30", icon: Activity },
  core:          { label: "Gainage/Core",   color: "text-[#00F5A0]",  bg: "bg-[#00F5A0]/10",  border: "border-[#00F5A0]/30", icon: Shield },
  cool_down:     { label: "Récupération",   color: "text-[#94A3B8]",  bg: "bg-[#94A3B8]/10",  border: "border-[#94A3B8]/30", icon: Wind },
  mobility:      { label: "Mobilité",       color: "text-[#00D4FF]",  bg: "bg-[#00D4FF]/10",  border: "border-[#00D4FF]/30", icon: Radius },
  activation:    { label: "Activation",     color: "text-[#FF6B35]",  bg: "bg-[#FF6B35]/10",  border: "border-[#FF6B35]/30", icon: Crosshair },
  technique:     { label: "Technique",      color: "text-[#F59E0B]",  bg: "bg-[#F59E0B]/10",  border: "border-[#F59E0B]/30", icon: Layers },
  plyometric:    { label: "Pliométrie",     color: "text-[#FB7185]",  bg: "bg-[#FB7185]/10",  border: "border-[#FB7185]/30", icon: BarChart2 },
  hiit:          { label: "Cardio HIIT",    color: "text-[#F97316]",  bg: "bg-[#F97316]/10",  border: "border-[#F97316]/30", icon: Gauge },
};

export const CONDITIONING_FORMATS = [
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "for_time", label: "For Time" },
  { value: "tabata", label: "Tabata" },
];

export interface ExerciseRow {
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  sets: number;
  reps: string;
  loadKg: number;
  restSeconds: number;
  coachCue: string;
  tempo: string;
  supersetGroup?: string;
  supersetLabel?: string;
}

export interface BlockDraft {
  id: string;
  type: BlockType;
  orderIndex: number;
  name: string;
  estimatedDurationMin: number;
  conditioningFormat?: string;
  exercises: ExerciseRow[];
  collapsed?: boolean;
}

export interface SessionDraft {
  name: string;
  type: typeof SESSION_TYPES[number];
  sessionType: "online" | "presentiel";
  scheduledTime: string;
  visioLink: string;
  estimatedDurationMin: number;
  coachNotes: string;
  isTest: boolean;
  blocks: BlockDraft[];
}

export const emptyBlock = (orderIndex: number, type: BlockType = "strength"): BlockDraft => ({
  id: Math.random().toString(36).slice(2, 8),
  type,
  orderIndex,
  name: BLOCK_TYPE_META[type].label,
  estimatedDurationMin: 15,
  exercises: [],
  collapsed: false,
});

export const emptySession = (): SessionDraft => ({
  name: "",
  type: "strength",
  sessionType: "online",
  scheduledTime: "",
  visioLink: "",
  estimatedDurationMin: 60,
  coachNotes: "",
  isTest: false,
  blocks: [emptyBlock(0, "warm_up"), emptyBlock(1, "strength")],
});

export function sessionToDraft(session: SessionWithVariants): SessionDraft {
  const normalVariant = session.variants.find((v) => v.mode === "normal");
  const exercises = normalVariant?.exercises ?? [];

  // Rebuild blocks from blockId groupings or create a single default block
  const blockMap = new Map<string, ExerciseRow[]>();
  const noBlockExercises: ExerciseRow[] = [];

  for (const e of exercises) {
    const row: ExerciseRow = {
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      orderIndex: e.orderIndex,
      sets: e.sets,
      reps: e.reps || "",
      loadKg: e.nominalLoadKg || 0,
      restSeconds: e.restSeconds || 60,
      coachCue: e.coachCue || "",
      tempo: e.tempo || "",
      supersetGroup: e.supersetGroup ?? undefined,
      supersetLabel: e.supersetLabel ?? undefined,
    };

    if (e.blockId) {
      const bid = e.blockId;
      if (!blockMap.has(bid)) blockMap.set(bid, []);
      blockMap.get(bid)!.push(row);
    } else {
      noBlockExercises.push(row);
    }
  }

  // If we have server-side blocks on the session (extended response)
  const serverBlocks = session.blocks;

  let blocks: BlockDraft[] = [];
  if (serverBlocks && serverBlocks.length > 0) {
    blocks = serverBlocks
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((b) => ({
        id: b.id,
        type: b.type as BlockType,
        orderIndex: b.orderIndex,
        name: b.name ?? BLOCK_TYPE_META[b.type as BlockType]?.label ?? b.type,
        estimatedDurationMin: b.estimatedDurationMin || 15,
        conditioningFormat: b.conditioningFormat ?? undefined,
        exercises: (blockMap.get(b.id) || []).sort((a, c) => a.orderIndex - c.orderIndex),
        collapsed: true,
      }));
  } else if (noBlockExercises.length > 0) {
    blocks = [{
      id: Math.random().toString(36).slice(2, 8),
      type: "strength",
      orderIndex: 0,
      name: "Force",
      estimatedDurationMin: 30,
      exercises: noBlockExercises.sort((a, b) => a.orderIndex - b.orderIndex),
      collapsed: false,
    }];
  }

  if (blocks.length === 0) {
    blocks = [emptyBlock(0, "warm_up"), emptyBlock(1, "strength")];
  }

  return {
    name: session.name,
    type: session.type as typeof SESSION_TYPES[number],
    sessionType: (session.sessionType === "presentiel" ? "presentiel" : "online") as "online" | "presentiel",
    scheduledTime: session.scheduledTime ?? "",
    visioLink: session.visioLink ?? "",
    estimatedDurationMin: session.estimatedDurationMin || 60,
    coachNotes: session.coachNotes || "",
    isTest: session.isTest ?? false,
    blocks,
  };
}

const EXERCISE_CATEGORIES = [
  { value: "compound", label: "Polyarticulaire" },
  { value: "isolation", label: "Isolation" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobilité" },
  { value: "core", label: "Core" },
  { value: "power", label: "Puissance" },
] as const;

interface ExercisePickerProps {
  onAdd: (ex: ExerciseData) => void;
  compact?: boolean;
}

export function ExercisePicker({ onAdd, compact }: ExercisePickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>("compound");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: exercises, refetch } = useGetExercises(
    { q: query || undefined, category: catFilter || undefined },
    { query: { queryKey: ["/api/exercises", query, catFilter], enabled: true } }
  );
  const filtered = (exercises || []).slice(0, compact ? 6 : 8);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), category: newCategory }),
      });
      if (!res.ok) throw new Error();
      const created: ExerciseData = await res.json();
      toast({ title: t("components.exercise_picker.exercise_created_toast", { name: created.name }) });
      onAdd(created);
      setCreating(false);
      setNewName("");
      refetch();
    } catch {
      toast({ title: t("components.exercise_picker.create_failed_toast"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("components.exercise_picker.search_placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-background border-border h-8 text-xs"
        />
      </div>
      <div className="flex gap-1 flex-wrap">
        {["", ...EXERCISE_CATEGORIES.map(c => c.value)].map((cat) => {
          const label = cat === "" ? t("components.exercise_picker.filter_all") : EXERCISE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                catFilter === cat
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className={cn("space-y-0.5 overflow-y-auto", compact ? "max-h-32" : "max-h-40")}>
        {filtered.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onAdd(ex)}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/5 text-xs flex items-center gap-2 group transition-colors"
          >
            <Dumbbell className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
            <span className="text-white truncate">{ex.name}</span>
            {ex.category && (
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{ex.category}</span>
            )}
          </button>
        ))}
        {filtered.length === 0 && !creating && (
          <p className="text-center py-2 text-xs text-muted-foreground">{t("components.exercise_picker.no_exercise_found")}</p>
        )}
      </div>

      {!creating ? (
        <button
          type="button"
          onClick={() => { setCreating(true); setNewName(query); }}
          className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-primary hover:text-primary/80 border border-dashed border-primary/30 hover:border-primary/60 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          {t("components.exercise_picker.create_new")}
        </button>
      ) : (
        <div className="border border-primary/30 rounded p-2 space-y-1.5 bg-primary/5">
          <p className="text-[10px] font-mono text-primary uppercase tracking-wider">{t("components.exercise_picker.new_exercise")}</p>
          <Input
            autoFocus
            placeholder={t("components.exercise_picker.name_placeholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="h-7 text-xs bg-background border-border"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-white text-xs"
          >
            {EXERCISE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 text-xs py-1 rounded border border-border text-muted-foreground hover:text-white transition-colors"
            >
              {t("components.exercise_picker.cancel")}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || isSaving}
              className="flex-1 text-xs py-1 rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : t("components.exercise_picker.create")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExerciseRowCardProps {
  ex: ExerciseRow;
  idx: number;
  total: number;
  blockType: BlockType;
  onChange: (patch: Partial<ExerciseRow>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  canSuperset?: boolean;
  onLinkSuperset?: () => void;
  onUnlinkSuperset?: () => void;
}

function TempoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parseDigits = (v: string): [string, string, string, string] => {
    const m = v.match(/^(\d)-(\d)-(\d)-(\d)$/);
    return m ? [m[1], m[2], m[3], m[4]] : ["", "", "", ""];
  };
  const [digits, setDigits] = useState<[string, string, string, string]>(() => parseDigits(value));
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3];
  const labels = ["exc", "bas", "con", "haut"];

  useEffect(() => {
    const parsed = parseDigits(value);
    setDigits(parsed);
  }, [value]);

  const update = (i: number, d: string) => {
    const next = [...digits] as [string, string, string, string];
    next[i] = d;
    setDigits(next);
    if (next.every(x => x !== "")) {
      onChange(next.join("-"));
    } else if (next.every(x => x === "")) {
      onChange("");
    }
    if (d && i < 3) refs[i + 1]?.current?.focus();
  };

  const items: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    items.push(
      <div key={i} className="flex flex-col items-center gap-0.5">
        <input
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]}
          onChange={e => {
            const v = e.target.value.replace(/\D/, "");
            update(i, v);
          }}
          onKeyDown={e => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs[i - 1]?.current?.focus();
            }
          }}
          className="w-8 h-8 text-center text-sm rounded border border-border bg-background text-white focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-[9px] text-muted-foreground font-mono">{labels[i]}</span>
      </div>
    );
    if (i < 3) {
      items.push(
        <span key={`sep-${i}`} className="text-muted-foreground text-lg self-start mt-1">-</span>
      );
    }
  }

  return (
    <div className="flex items-end gap-0.5">
      {items}
    </div>
  );
}

function ExerciseRowCard({ ex, idx, total, blockType, onChange, onRemove, onMove, onDuplicate, canSuperset, onLinkSuperset, onUnlinkSuperset }: ExerciseRowCardProps) {
  const { t } = useTranslation();
  const isInSuperset = !!ex.supersetGroup;
  const label = ex.supersetLabel || "";
  const isSimple = blockType === "warm_up" || blockType === "cool_down" || blockType === "mobility";
  const isCore = blockType === "core" || blockType === "activation";
  const isConditioning = blockType === "conditioning" || blockType === "hiit" || blockType === "plyometric";
  const isTechnique = blockType === "technique";

  const fieldCls = "h-6 text-xs bg-background border-border mt-0.5 px-2";
  const labelCls = "text-[9px] text-muted-foreground uppercase tracking-wider";

  return (
    <div className={cn(
      "rounded-lg border p-2.5 space-y-2 text-xs transition-colors",
      isInSuperset
        ? "border-[#A855F7]/30 bg-[#A855F7]/5"
        : "border-border bg-background/50"
    )}>
      <div className="flex items-center gap-1.5">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
        {isInSuperset && (
          <span className="font-mono font-bold text-[#A855F7] text-[10px] bg-[#A855F7]/20 px-1 rounded">{label}</span>
        )}
        <span className="font-medium text-white truncate flex-1">{ex.exerciseName}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {isInSuperset ? (
            <button type="button" onClick={onUnlinkSuperset} className="p-0.5 rounded hover:bg-[#A855F7]/20 transition-colors" title={t("components.program_editor.superset_unlink")}>
              <LinkIcon className="w-3 h-3 text-[#A855F7]/60" />
            </button>
          ) : (canSuperset && (
            <button type="button" onClick={onLinkSuperset} className="p-0.5 rounded hover:bg-[#A855F7]/20 transition-colors" title={t("components.program_editor.superset_create")}>
              <LinkIcon className="w-3 h-3 text-[#A855F7]" />
            </button>
          ))}
          <button type="button" onClick={onDuplicate} className="p-0.5 rounded hover:bg-primary/20 transition-colors" title={t("components.program_editor.duplicate_exercise")}>
            <Copy className="w-3 h-3 text-primary/60" />
          </button>
          <button type="button" onClick={() => onMove(-1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30">
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={idx === total - 1} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30">
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <button type="button" onClick={onRemove} className="p-0.5 rounded hover:bg-destructive/20">
            <X className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>

      {isSimple ? (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className={labelCls}>{t("components.program_editor.label_duration_s")}</label>
            <Input type="number" min={0} value={ex.restSeconds} onChange={e => onChange({ restSeconds: +e.target.value })}
              className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>{t("components.program_editor.label_indication")}</label>
            <Input value={ex.coachCue} onChange={e => onChange({ coachCue: e.target.value })}
              placeholder={t("components.program_editor.placeholder_breathing")} className={fieldCls} />
          </div>
        </div>
      ) : isCore ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className={labelCls}>{t("components.program_editor.label_sets")}</label>
              <Input type="number" min={1} value={ex.sets} onChange={e => onChange({ sets: +e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_duration_reps")}</label>
              <Input value={ex.reps} onChange={e => onChange({ reps: e.target.value })} placeholder={t("components.program_editor.placeholder_reps_30")} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_rest_s")}</label>
              <Input type="number" min={0} value={ex.restSeconds} onChange={e => onChange({ restSeconds: +e.target.value })} className={fieldCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("components.program_editor.label_indication_coach")}</label>
            <Input value={ex.coachCue} onChange={e => onChange({ coachCue: e.target.value })}
              placeholder={t("components.program_editor.placeholder_core_cue")} className={fieldCls} />
          </div>
        </>
      ) : isConditioning ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className={labelCls}>{t("components.program_editor.label_rounds_sets")}</label>
              <Input type="number" min={1} value={ex.sets} onChange={e => onChange({ sets: +e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_dose_reps")}</label>
              <Input value={ex.reps} onChange={e => onChange({ reps: e.target.value })} placeholder={t("components.program_editor.placeholder_reps_10_30")} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_rest_s")}</label>
              <Input type="number" min={0} value={ex.restSeconds} onChange={e => onChange({ restSeconds: +e.target.value })} className={fieldCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("components.program_editor.label_indication_coach")}</label>
            <Input value={ex.coachCue} onChange={e => onChange({ coachCue: e.target.value })}
              placeholder={t("components.program_editor.placeholder_intensity")} className={fieldCls} />
          </div>
        </>
      ) : isTechnique ? (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className={labelCls}>{t("components.program_editor.label_sets")}</label>
              <Input type="number" min={1} value={ex.sets} onChange={e => onChange({ sets: +e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_reps_duration")}</label>
              <Input value={ex.reps} onChange={e => onChange({ reps: e.target.value })} placeholder={t("components.program_editor.placeholder_reps_5_30")} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_rest_s")}</label>
              <Input type="number" min={0} value={ex.restSeconds} onChange={e => onChange({ restSeconds: +e.target.value })} className={fieldCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className={labelCls}>{t("components.program_editor.label_tempo")}</label>
              <TempoInput value={ex.tempo} onChange={v => onChange({ tempo: v })} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_technique_key")}</label>
              <Input value={ex.coachCue} onChange={e => onChange({ coachCue: e.target.value })}
                placeholder={t("components.program_editor.placeholder_alignment")} className={fieldCls} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <div>
              <label className={labelCls}>{t("components.program_editor.label_sets")}</label>
              <Input type="number" min={1} value={ex.sets} onChange={e => onChange({ sets: +e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_reps")}</label>
              <Input value={ex.reps} onChange={e => onChange({ reps: e.target.value })} placeholder={t("components.program_editor.placeholder_reps_default")} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_load")}</label>
              <Input type="number" min={0} value={ex.loadKg} onChange={e => onChange({ loadKg: +e.target.value })} className={fieldCls} placeholder={t("components.program_editor.placeholder_load_default")} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_rest_s")}</label>
              <Input type="number" min={0} value={ex.restSeconds} onChange={e => onChange({ restSeconds: +e.target.value })} className={fieldCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className={labelCls}>{t("components.program_editor.label_tempo_full")}</label>
              <TempoInput value={ex.tempo} onChange={v => onChange({ tempo: v })} />
            </div>
            <div>
              <label className={labelCls}>{t("components.program_editor.label_indication_coach")}</label>
              <Input value={ex.coachCue} onChange={e => onChange({ coachCue: e.target.value })}
                placeholder={t("components.program_editor.placeholder_default_cue")} className={fieldCls} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type DragHandleProps = React.HTMLAttributes<HTMLElement>;
function SortableBlockItem({ id, children }: { id: string; children: (handleProps: DragHandleProps) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50 z-10" : undefined}
    >
      {children({ ...listeners, ...attributes })}
    </div>
  );
}

interface BlockEditorProps {
  blocks: BlockDraft[];
  onChange: (blocks: BlockDraft[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const { t } = useTranslation();
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleBlockDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(blocks, oldIdx, newIdx);
    onChange(reordered.map((b, i) => ({ ...b, orderIndex: i })));
  }, [blocks, onChange]);

  const updateBlock = (bIdx: number, patch: Partial<BlockDraft>) => {
    onChange(blocks.map((b, i) => i === bIdx ? { ...b, ...patch } : b));
  };

  const addBlock = () => {
    const order = blocks.length;
    const newBlock = emptyBlock(order, "strength");
    onChange([...blocks, newBlock]);
  };

  const removeBlock = (bIdx: number) => {
    onChange(blocks.filter((_, i) => i !== bIdx).map((b, i) => ({ ...b, orderIndex: i })));
    if (pickerOpenIdx === bIdx) setPickerOpenIdx(null);
  };

  const addExercise = (bIdx: number, ex: ExerciseData) => {
    const block = blocks[bIdx];
    const newEx: ExerciseRow = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      orderIndex: block.exercises.length,
      sets: 3,
      reps: "8-10",
      loadKg: 0,
      restSeconds: 90,
      coachCue: "",
      tempo: "",
    };
    updateBlock(bIdx, { exercises: [...block.exercises, newEx] });
  };

  const updateExercise = (bIdx: number, eIdx: number, patch: Partial<ExerciseRow>) => {
    const block = blocks[bIdx];
    updateBlock(bIdx, {
      exercises: block.exercises.map((e, i) => i === eIdx ? { ...e, ...patch } : e),
    });
  };

  const removeExercise = (bIdx: number, eIdx: number) => {
    const block = blocks[bIdx];
    updateBlock(bIdx, {
      exercises: block.exercises.filter((_, i) => i !== eIdx).map((e, i) => ({ ...e, orderIndex: i })),
    });
  };

  const moveExercise = (bIdx: number, eIdx: number, dir: -1 | 1) => {
    const block = blocks[bIdx];
    const next = [...block.exercises];
    const target = eIdx + dir;
    if (target < 0 || target >= next.length) return;
    [next[eIdx], next[target]] = [next[target], next[eIdx]];
    updateBlock(bIdx, { exercises: next.map((e, i) => ({ ...e, orderIndex: i })) });
  };

  const duplicateExercise = (bIdx: number, eIdx: number) => {
    const block = blocks[bIdx];
    const src = block.exercises[eIdx];
    const copy: ExerciseRow = {
      ...src,
      supersetGroup: undefined,
      supersetLabel: undefined,
      orderIndex: eIdx + 1,
    };
    const next = [
      ...block.exercises.slice(0, eIdx + 1),
      copy,
      ...block.exercises.slice(eIdx + 1),
    ];
    updateBlock(bIdx, { exercises: next.map((e, i) => ({ ...e, orderIndex: i })) });
  };

  const duplicateBlock = (bIdx: number) => {
    const src = blocks[bIdx];
    const copy: BlockDraft = {
      ...src,
      id: Math.random().toString(36).slice(2, 8),
      orderIndex: bIdx + 1,
      exercises: src.exercises.map(e => ({ ...e, supersetGroup: undefined, supersetLabel: undefined })),
      collapsed: false,
    };
    const next = [
      ...blocks.slice(0, bIdx + 1),
      copy,
      ...blocks.slice(bIdx + 1),
    ];
    onChange(next.map((b, i) => ({ ...b, orderIndex: i })));
  };

  const linkSuperset = (bIdx: number, eIdx: number) => {
    const block = blocks[bIdx];
    const exercises = [...block.exercises];
    const cur = exercises[eIdx];
    const next = exercises[eIdx + 1];
    if (!next) return;
    if (cur.supersetGroup) {
      // Extend existing superset: add next exercise as A3, A4, etc.
      const groupId = cur.supersetGroup;
      const groupMembers = exercises.filter(e => e.supersetGroup === groupId);
      const nextLabel = `A${groupMembers.length + 1}`;
      exercises[eIdx + 1] = { ...next, supersetGroup: groupId, supersetLabel: nextLabel };
    } else {
      // Create new A1/A2 superset group
      const groupId = Math.random().toString(36).slice(2, 6);
      exercises[eIdx] = { ...cur, supersetGroup: groupId, supersetLabel: "A1" };
      exercises[eIdx + 1] = { ...next, supersetGroup: groupId, supersetLabel: "A2" };
    }
    updateBlock(bIdx, { exercises: exercises.map((e, i) => ({ ...e, orderIndex: i })) });
  };

  const unlinkSuperset = (bIdx: number, eIdx: number) => {
    const block = blocks[bIdx];
    const ex = block.exercises[eIdx];
    const groupId = ex.supersetGroup;
    if (!groupId) return;
    updateBlock(bIdx, {
      exercises: block.exercises.map(e =>
        e.supersetGroup === groupId ? { ...e, supersetGroup: undefined, supersetLabel: undefined } : e
      ),
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {blocks.map((block, bIdx) => {
            const meta = BLOCK_TYPE_META[block.type] || BLOCK_TYPE_META.strength;
            const Icon = meta.icon;
            const isOpen = !block.collapsed;

            return (
              <SortableBlockItem key={block.id} id={block.id}>
                {(dragHandleProps) => (
                  <div className={cn("rounded-xl border overflow-hidden transition-colors", meta.border, meta.bg)}>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div {...dragHandleProps} className="cursor-grab touch-none p-0.5" title={t("components.program_editor.drag_block")}>
                        <GripVertical className={cn("w-4 h-4 shrink-0", meta.color, "opacity-60")} />
                      </div>
                      <Icon className={cn("w-4 h-4 shrink-0", meta.color)} />
                      <select
                        value={block.type}
                        onChange={e => updateBlock(bIdx, { type: e.target.value as BlockType, name: BLOCK_TYPE_META[e.target.value as BlockType]?.label || block.name })}
                        className={cn("bg-transparent text-xs font-semibold border-none outline-none cursor-pointer", meta.color)}
                      >
                        {BLOCK_TYPES.map(bt => (
                          <option key={bt} value={bt} className="text-white bg-[#1A1A1A]">{BLOCK_TYPE_META[bt].label}</option>
                        ))}
                      </select>
                      <Input
                        value={block.name}
                        onChange={e => updateBlock(bIdx, { name: e.target.value })}
                        placeholder={t("components.program_editor.block_name_placeholder")}
                        className="h-6 text-xs bg-transparent border-transparent hover:border-border focus:border-border focus:bg-background/80 px-2 flex-1 min-w-0 transition-colors"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <Input
                            type="number"
                            min={1}
                            value={block.estimatedDurationMin}
                            onChange={e => updateBlock(bIdx, { estimatedDurationMin: +e.target.value })}
                            className="h-6 w-12 text-xs bg-background/60 border-border px-1 text-center"
                          />
                          <span className="text-[10px] text-muted-foreground">min</span>
                        </div>
                        {(block.type === "conditioning" || block.type === "hiit") && (
                          <select
                            value={block.conditioningFormat || ""}
                            onChange={e => updateBlock(bIdx, { conditioningFormat: e.target.value || undefined })}
                            className="h-6 bg-background/60 border border-border rounded text-[10px] text-white px-1"
                          >
                            <option value="">{t("components.program_editor.format_select_placeholder")}</option>
                            {CONDITIONING_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={() => duplicateBlock(bIdx)}
                          className="p-0.5 rounded hover:bg-primary/20 transition-colors" title={t("components.program_editor.duplicate_block")}>
                          <Copy className="w-3 h-3 text-primary/60" />
                        </button>
                        <button type="button" onClick={() => updateBlock(bIdx, { collapsed: isOpen })}
                          className="p-0.5 rounded hover:bg-white/10 transition-colors">
                          {isOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </button>
                        <button type="button" onClick={() => removeBlock(bIdx)}
                          className="p-0.5 rounded hover:bg-destructive/20 transition-colors">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                        <div className="space-y-1.5">
                          {block.exercises.map((ex, eIdx) => {
                            const supportsSuperset = block.type === "strength" || block.type === "power" || block.type === "plyometric" || block.type === "technique" || block.type === "conditioning";
                            const canLink = supportsSuperset && eIdx < block.exercises.length - 1 && !block.exercises[eIdx + 1]?.supersetGroup;
                            return (
                              <ExerciseRowCard
                                key={eIdx}
                                ex={ex}
                                idx={eIdx}
                                total={block.exercises.length}
                                blockType={block.type}
                                onChange={patch => updateExercise(bIdx, eIdx, patch)}
                                onRemove={() => removeExercise(bIdx, eIdx)}
                                onMove={dir => moveExercise(bIdx, eIdx, dir)}
                                onDuplicate={() => duplicateExercise(bIdx, eIdx)}
                                canSuperset={canLink}
                                onLinkSuperset={() => linkSuperset(bIdx, eIdx)}
                                onUnlinkSuperset={() => unlinkSuperset(bIdx, eIdx)}
                              />
                            );
                          })}
                        </div>

                        {pickerOpenIdx === bIdx ? (
                          <div className="border border-dashed border-border rounded-lg p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{t("components.program_editor.add_exercise")}</p>
                              <button type="button" onClick={() => setPickerOpenIdx(null)} className="p-0.5 rounded hover:bg-white/10">
                                <X className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <ExercisePicker
                              compact
                              onAdd={ex => { addExercise(bIdx, ex); setPickerOpenIdx(null); }}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPickerOpenIdx(bIdx)}
                            className={cn(
                              "w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-dashed transition-colors",
                              meta.border,
                              meta.color,
                              "hover:opacity-80"
                            )}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t("components.program_editor.add_exercise")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </SortableBlockItem>
            );
          })}

          <button
            type="button"
            onClick={addBlock}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border text-muted-foreground hover:text-white hover:border-white/20 text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("components.program_editor.add_block")}
          </button>
        </div>
      </SortableContext>
    </DndContext>
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
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SessionDraft>(() =>
    session ? sessionToDraft(session) : emptySession()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const addMutation = useAddProgramSession();
  const updateMutation = useUpdateProgramSession();
  const { toast } = useToast();

  const isEdit = !!session;
  const dayName = DAY_NAMES[dayNumber - 1] || t("components.program_editor.day_label", { n: dayNumber });

  const autoDurationMin = useMemo(() => {
    const allExercises = draft.blocks.flatMap(b => b.exercises);
    if (allExercises.length === 0) return null;
    const totalSeconds = allExercises.reduce((sum, ex) => {
      return sum + Math.max(ex.sets || 1, 1) * Math.max(ex.restSeconds || 60, 0);
    }, 0);
    return Math.max(1, Math.round(totalSeconds / 60));
  }, [draft.blocks]);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({ title: t("components.program_editor.toast_name_required"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const blocksPayload: CreateSessionRequestBlocksItem[] = draft.blocks.map((b, bIdx) => ({
        type: b.type,
        orderIndex: bIdx,
        name: b.name,
        estimatedDurationMin: b.estimatedDurationMin,
        conditioningFormat: b.conditioningFormat || undefined,
        exercises: b.exercises.map((ex, eIdx) => ({
          exerciseId: ex.exerciseId,
          orderIndex: eIdx,
          sets: ex.sets,
          reps: ex.reps,
          loadKg: ex.loadKg,
          restSeconds: ex.restSeconds,
          coachCue: ex.coachCue,
          tempo: ex.tempo || undefined,
          supersetGroup: ex.supersetGroup,
          supersetLabel: ex.supersetLabel,
        })),
      }));

      // Send only blocks — server synthesizes the normal variant with correct blockIds.
      // Do NOT send explicit variants together with blocks or exercises will have null blockId.
      const payload: CreateSessionRequest = {
        weekNumber,
        dayNumber,
        name: draft.name,
        type: draft.type as CreateSessionRequest["type"],
        sessionType: draft.sessionType,
        scheduledTime: draft.scheduledTime || null,
        visioLink: draft.visioLink || null,
        estimatedDurationMin: autoDurationMin ?? draft.estimatedDurationMin,
        coachNotes: draft.coachNotes,
        isTest: draft.isTest,
        blocks: blocksPayload,
      };

      if (isEdit && session) {
        await updateMutation.mutateAsync({ programId, sessionId: session.id, data: payload });
      } else {
        await addMutation.mutateAsync({ programId, data: payload });
      }
      toast({ title: isEdit ? t("components.program_editor.toast_session_updated") : t("components.program_editor.toast_session_added") });
      onSaved();
    } catch {
      toast({ title: t("components.program_editor.toast_save_failed"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-display text-2xl tracking-widest text-white">
            {t(isEdit ? "components.program_editor.modal_title_edit" : "components.program_editor.modal_title_new", { week: weekNumber, day: dayName })}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {/* Session metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t("components.program_editor.label_session_name")}</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder={t("components.program_editor.placeholder_session_name")}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t("components.program_editor.label_type")}</label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as typeof SESSION_TYPES[number] }))}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {SESSION_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>{SESSION_TYPE_LABELS[st] ?? st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t("components.program_editor.label_format")}</label>
              <div className="flex gap-2">
                {(["online", "presentiel"] as const).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, sessionType: loc }))}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium transition-colors",
                      draft.sessionType === loc
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {loc === "online" ? t("components.program_editor.format_online") : t("components.program_editor.format_in_person")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                {t("components.program_editor.label_scheduled_time")}
              </label>
              <Input
                type="time"
                value={draft.scheduledTime}
                onChange={(e) => setDraft((d) => ({ ...d, scheduledTime: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>

          {draft.sessionType === "online" && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                {t("components.program_editor.label_visio_link")} <span className="normal-case opacity-60">{t("components.program_editor.optional")}</span>
              </label>
              <Input
                value={draft.visioLink}
                onChange={(e) => setDraft((d) => ({ ...d, visioLink: e.target.value }))}
                placeholder="https://meet.google.com/..."
                className="bg-background border-border"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t("components.program_editor.label_coach_notes")}</label>
            <Input
              value={draft.coachNotes}
              onChange={(e) => setDraft((d) => ({ ...d, coachNotes: e.target.value }))}
              placeholder={t("components.program_editor.placeholder_optional_notes")}
              className="bg-background border-border"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, isTest: !d.isTest }))}
              className={cn(
                "flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                draft.isTest
                  ? "bg-orange-400/15 border-orange-400 text-orange-400"
                  : "bg-background border-border text-muted-foreground hover:border-muted-foreground"
              )}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {t("components.program_editor.label_is_test")}
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t("components.program_editor.label_estimated_duration")}</label>
            <div className="relative max-w-[200px]">
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
          </div>

          {/* Auto-variant banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="components.program_editor.auto_variants"
                components={{
                  0: <span className="text-primary font-medium" />,
                  1: <span className="text-white" />,
                  2: <span className="text-accent" />,
                  3: <span className="text-violet-400" />,
                }}
              />
            </p>
          </div>

          {/* Block editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("components.program_editor.session_structure")}</p>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Importer par texte
              </button>
            </div>
            <BlockEditor
              blocks={draft.blocks}
              onChange={(blocks) => setDraft((d) => ({ ...d, blocks }))}
            />
          </div>
        </div>

        <div className="shrink-0 flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="border-border" onClick={onClose}>
            {t("components.program_editor.cancel")}
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? t("components.program_editor.update") : t("components.program_editor.add_session")}
          </Button>
        </div>
      </DialogContent>
      <SessionImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(blocks) => {
          setDraft(d => ({ ...d, blocks }));
          setImportOpen(false);
        }}
      />
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
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [quickImportOpen, setQuickImportOpen] = useState(false);
  const deleteMutation = useDeleteProgramSession();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!session) return;
    try {
      await deleteMutation.mutateAsync({ programId, sessionId: session.id });
      toast({ title: t("components.program_editor.toast_session_deleted") });
      onRefetch();
    } catch {
      toast({ title: t("components.program_editor.toast_delete_failed"), variant: "destructive" });
    }
  };

  if (!session) {
    return (
      <>
        <div className="w-full h-full min-h-[60px] rounded-lg border border-dashed border-border hover:border-primary/30 transition-all group flex flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center justify-center w-full flex-1 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <button
            type="button"
            onClick={() => setQuickImportOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors border-t border-border w-full justify-center"
          >
            <FileText className="w-2.5 h-2.5" />
            Importer
          </button>
        </div>
        <SessionModal
          programId={programId}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); onRefetch(); }}
        />
        <QuickImportSession
          programId={programId}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          open={quickImportOpen}
          onClose={() => setQuickImportOpen(false)}
          onSaved={() => { setQuickImportOpen(false); onRefetch(); }}
        />
      </>
    );
  }

  const modeStyles = session.variants.reduce<Record<string, boolean>>((acc, v) => {
    if (v.exercises.length > 0) acc[v.mode] = true;
    return acc;
  }, {});

  const normalVariant = session.variants.find((v) => v.mode === "normal");
  const exercises = normalVariant?.exercises ?? [];
  const typeColor = SESSION_TYPE_COLORS[session.type] ?? SESSION_TYPE_COLORS.strength;
  const TypeIcon = SESSION_TYPE_ICONS[session.type] ?? Dumbbell;

  return (
    <>
      <div className={cn(
        "group w-full rounded-lg border bg-card transition-all relative overflow-hidden",
        expanded ? "border-white/20" : "border-border hover:border-white/20"
      )}>
        <div className={cn("absolute top-0 left-0 w-0.5 h-full", typeColor.dot, session.isTest && "bg-orange-400")} />
        <div className="p-2 pl-3 cursor-pointer" onClick={() => setEditOpen(true)}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          <p className="text-xs font-semibold text-white truncate leading-tight mb-1 pr-5">{session.name}</p>
          <div className="flex items-center gap-1 mb-1.5">
            <div className={cn("flex items-center gap-1", typeColor.text)}>
              <TypeIcon className="w-2.5 h-2.5 shrink-0" />
              <span className="text-[10px] font-mono capitalize">{SESSION_TYPE_LABELS[session.type] ?? session.type}</span>
            </div>
            {session.isTest && (
              <span
                title="Séance test"
                className="flex items-center gap-0.5 text-[8px] uppercase font-bold px-1 py-0.5 rounded-sm bg-orange-400/10 text-orange-400 border border-dashed border-orange-400/40"
              >
                <FlaskConical className="w-2 h-2" />
                Test
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1">
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
            <div className="flex items-center gap-0.5 shrink-0">
              {session.estimatedDurationMin && (
                <span className="text-[9px] text-muted-foreground font-mono">{session.estimatedDurationMin}m</span>
              )}
              {exercises.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  {expanded
                    ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {expanded && exercises.length > 0 && (
          <div className="border-t border-border px-2 pb-2 pt-1.5 space-y-1">
            {exercises.map((ex, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-white truncate flex-1">{ex.exerciseName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {ex.sets}×{ex.reps || "—"}
                    {ex.nominalLoadKg ? ` @${ex.nominalLoadKg}kg` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  {ex.restSeconds != null && ex.restSeconds > 0 && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      <Clock className="w-2 h-2 inline mr-0.5" />
                      {t("components.program_editor.rest_seconds_short", { n: ex.restSeconds })}
                    </span>
                  )}
                  {ex.coachCue && (
                    <span className="text-[9px] text-primary/70 italic truncate">{ex.coachCue}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-all z-10"
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
            <AlertDialogTitle className="font-display text-xl text-white">{t("components.program_editor.delete_session_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("components.program_editor.delete_session_desc", { name: session.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t("components.program_editor.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("components.program_editor.delete")}
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
  const { t } = useTranslation();
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
        {t("components.program_editor.program_not_found")}
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
            <h3 className="font-display text-sm text-white tracking-wider">{t("components.program_editor.week_label", { n: week })}</h3>
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

interface QuickImportSessionProps {
  programId: string;
  weekNumber: number;
  dayNumber: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function QuickImportSession({ programId, weekNumber, dayNumber, open, onClose, onSaved }: QuickImportSessionProps) {
  const [step, setStep] = useState<"import" | "name">("import");
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const addMutation = useAddProgramSession();
  const { toast } = useToast();

  const handleImport = (importedBlocks: BlockDraft[]) => {
    setBlocks(importedBlocks);
    setStep("name");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const blocksPayload: CreateSessionRequestBlocksItem[] = blocks.map((b, bIdx) => ({
        type: b.type,
        orderIndex: bIdx,
        name: b.name,
        estimatedDurationMin: b.estimatedDurationMin,
        conditioningFormat: b.conditioningFormat || undefined,
        exercises: b.exercises.map((ex, eIdx) => ({
          exerciseId: ex.exerciseId,
          orderIndex: eIdx,
          sets: ex.sets,
          reps: ex.reps,
          loadKg: ex.loadKg,
          restSeconds: ex.restSeconds,
          coachCue: ex.coachCue,
          tempo: ex.tempo || undefined,
        })),
      }));
      await addMutation.mutateAsync({
        programId,
        data: {
          weekNumber,
          dayNumber,
          name: name.trim(),
          type: "strength",
          sessionType: "online",
          scheduledTime: null,
          visioLink: null,
          estimatedDurationMin: 60,
          coachNotes: "",
          blocks: blocksPayload,
        },
      });
      toast({ title: "Séance importée ✓" });
      onSaved();
    } catch {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep("import");
    setBlocks([]);
    setName("");
    onClose();
  };

  if (step === "import") {
    return (
      <SessionImportModal
        open={open}
        onClose={handleClose}
        onImport={handleImport}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-widest text-white">
            Nommer la séance
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              {blocks[0]?.exercises.length ?? 0} exercice(s) importé(s) — donne un nom à cette séance.
            </p>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Force Bas du corps, Push Day…"
              className="bg-background border-border"
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-border" onClick={() => setStep("import")}>
              Retour
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder la séance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
