import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Loader2, CheckCircle2, AlertCircle,
  ChevronRight, X, Search, RotateCcw, ClipboardPaste,
  Layers, Plus, Sparkles,
} from "lucide-react";
import { cn } from "@/components/ui/mode-badge";
import { useGetExercises, ExerciseData, useConvertSessionTextWithAi } from "@workspace/api-client-react";
import { BlockDraft, BlockType, ExerciseRow, emptyBlock, BLOCK_TYPE_META } from "./program-editor";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedExercise {
  rawName: string;
  sets: number;
  reps: string;
  isDuration: boolean;
  loadKg: number;
  restSeconds: number;
  tempo: string;
  coachCue: string;
  matchedExercise: ExerciseData | null;
  matchCandidates: ExerciseData[];
  status: "matched" | "ambiguous" | "unmatched";
}

interface ParsedBlock {
  blockType: BlockType;
  blockLabel: string;
  durationMin: number;
  exercises: ParsedExercise[];
}

// ─── Matching helpers ─────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (t === q) return 1;
  if (t.includes(q) || q.includes(t)) return 0.92;

  const qToks = q.split(" ").filter(w => w.length > 2);
  const tToks = t.split(" ").filter(w => w.length > 2);

  let tokenScore = 0;
  if (qToks.length > 0 && tToks.length > 0) {
    let hits = 0;
    for (const qt of qToks) {
      if (tToks.some(tt => tt === qt)) { hits += 1; continue; }
      if (tToks.some(tt => tt.includes(qt) || qt.includes(tt))) { hits += 0.7; continue; }
    }
    const union = qToks.length + tToks.length - hits;
    tokenScore = union > 0 ? hits / union : 0;
  }

  const dist = levenshtein(q, t);
  const levScore = Math.max(0, 1 - dist / Math.max(q.length, t.length));

  return Math.max(tokenScore, levScore * 0.85);
}

function findMatches(name: string, exercises: ExerciseData[]): ExerciseData[] {
  return exercises
    .map(ex => ({ ex, score: fuzzyScore(name, ex.name) }))
    .filter(({ score }) => score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ ex }) => ex);
}

function matchExercise(name: string, exercises: ExerciseData[]): Pick<ParsedExercise, "matchedExercise" | "matchCandidates" | "status"> {
  const candidates = findMatches(name, exercises);
  const best = candidates[0];
  const bestScore = best ? fuzzyScore(name, best.name) : 0;
  if (bestScore >= 0.80) return { matchedExercise: best, matchCandidates: candidates, status: "matched" };
  if (bestScore >= 0.35) return { matchedExercise: null, matchCandidates: candidates, status: "ambiguous" };
  return { matchedExercise: null, matchCandidates: [], status: "unmatched" };
}

// ─── Block type mapping ───────────────────────────────────────────────────────

const BLOCK_LABEL_MAP: Array<{ patterns: string[]; type: BlockType }> = [
  { patterns: ["echauffement", "warm up", "warmup", "chauffe"], type: "warm_up" },
  { patterns: ["force", "strength"], type: "strength" },
  { patterns: ["puissance", "power"], type: "power" },
  { patterns: ["conditioning", "conditionnement"], type: "conditioning" },
  { patterns: ["gainage", "core", "gainage/core"], type: "core" },
  { patterns: ["recuperation", "cool down", "cooldown", "retour au calme"], type: "cool_down" },
  { patterns: ["mobilite", "mobility"], type: "mobility" },
  { patterns: ["activation"], type: "activation" },
  { patterns: ["technique"], type: "technique" },
  { patterns: ["pliometrie", "plyometrie", "plyometric"], type: "plyometric" },
  { patterns: ["hiit", "cardio hiit", "cardio"], type: "hiit" },
  { patterns: ["hypertrophie", "hypertrophy"], type: "strength" },
];

function detectBlockType(label: string): BlockType {
  const n = normalize(label);
  for (const { patterns, type } of BLOCK_LABEL_MAP) {
    if (patterns.some(p => n.includes(p))) return type;
  }
  return "strength";
}

// ─── Block-aware per-field semantics ─────────────────────────────────────────

type BlockFieldProfile = {
  showLoad: boolean;
  showTempo: boolean;
  showCoachCue: boolean;
  repsLabel: string;
};

function blockProfile(type: BlockType): BlockFieldProfile {
  switch (type) {
    case "warm_up":
    case "cool_down":
    case "mobility":
      return { showLoad: false, showTempo: false, showCoachCue: true, repsLabel: "Durée" };
    case "core":
    case "activation":
      return { showLoad: false, showTempo: false, showCoachCue: true, repsLabel: "Reps / Durée" };
    case "conditioning":
    case "hiit":
      return { showLoad: false, showTempo: false, showCoachCue: false, repsLabel: "Reps / Durée" };
    default:
      return { showLoad: true, showTempo: true, showCoachCue: false, repsLabel: "Reps" };
  }
}

// ─── Dosage parser ────────────────────────────────────────────────────────────

interface Dosage {
  sets: number;
  reps: string;
  isDuration: boolean;
}

function parseDosage(raw: string): Dosage {
  const s = raw.trim();

  // NxMs / NxMsec — e.g. "3x45s", "3x45sec"
  const timeRepsMatch = s.match(/^(\d+)\s*[xX×]\s*(\d+)\s*(?:sec|s)$/i);
  if (timeRepsMatch) {
    return { sets: parseInt(timeRepsMatch[1]), reps: `${timeRepsMatch[2]}s`, isDuration: true };
  }

  // NxM — e.g. "4x8", "3x10-12"
  const setsRepsMatch = s.match(/^(\d+)\s*[xX×]\s*(\d+(?:-\d+)?)$/);
  if (setsRepsMatch) {
    return { sets: parseInt(setsRepsMatch[1]), reps: setsRepsMatch[2], isDuration: false };
  }

  // Ms / Msec alone — e.g. "30s", "45sec"
  const durationOnly = s.match(/^(\d+)\s*(?:sec|s)$/i);
  if (durationOnly) {
    return { sets: 1, reps: `${durationOnly[1]}s`, isDuration: true };
  }

  // Mmin alone — e.g. "2min"
  const minOnly = s.match(/^(\d+)\s*min$/i);
  if (minOnly) {
    return { sets: 1, reps: `${parseInt(minOnly[1]) * 60}s`, isDuration: true };
  }

  // Plain number — e.g. "10", "8-12"
  const plainReps = s.match(/^(\d+(?:-\d+)?)$/);
  if (plainReps) {
    return { sets: 1, reps: plainReps[1], isDuration: false };
  }

  return { sets: 3, reps: "8-10", isDuration: false };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

function parseSessionText(text: string, exercises: ExerciseData[]): ParsedBlock[] {
  const lines = text.split("\n").map(l => l.trim());
  const blocks: ParsedBlock[] = [];
  let currentBlock: ParsedBlock | null = null;

  for (const line of lines) {
    if (!line) continue;

    // ── [BLOC] header ──
    const blocMatch = line.match(/^\[BLOC\]\s*(.+?)(?:\s*\|\s*(\d+(?:[.,]\d+)?)\s*min)?$/i);
    if (blocMatch) {
      const label = blocMatch[1].trim();
      const durationMin = blocMatch[2] ? parseFloat(blocMatch[2].replace(",", ".")) : 15;
      currentBlock = {
        blockType: detectBlockType(label),
        blockLabel: label,
        durationMin,
        exercises: [],
      };
      blocks.push(currentBlock);
      continue;
    }

    // ── Exercise line ──
    // Skip lines that look like section headers without [BLOC] prefix but contain no pipe
    if (!currentBlock) {
      // Create an implicit "strength" block
      currentBlock = { blockType: "strength", blockLabel: "Force", durationMin: 20, exercises: [] };
      blocks.push(currentBlock);
    }

    // Split by pipe
    const parts = line.split("|").map(p => p.trim());
    const rawName = parts[0].replace(/^\d+[\.\)]\s*/, "").replace(/^[-•*]\s*/, "").trim();
    if (!rawName) continue;

    let sets = 3;
    let reps = "8-10";
    let isDuration = false;
    let loadKg = 0;
    let restSeconds = 90;
    let tempo = "";
    let coachCue = "";

    if (parts.length >= 2) {
      // Field 1: dosage
      const dosage = parseDosage(parts[1]);
      sets = dosage.sets;
      reps = dosage.reps;
      isDuration = dosage.isDuration;

      // Fields 2+: detect by content
      for (let i = 2; i < parts.length; i++) {
        const f = parts[i].trim();

        // Load: "80kg", "60%", "PDC", "poids de corps"
        if (/^(?:pdc|poids\s*de\s*corps)$/i.test(f)) {
          loadKg = 0;
        } else if (/^\d+(?:[.,]\d+)?\s*kg$/i.test(f)) {
          loadKg = parseFloat(f.replace(",", "."));
        } else if (/^\d+(?:[.,]\d+)?\s*%$/i.test(f)) {
          loadKg = 0;

        // Rest: "repos 90s", "repos 60", "90s", "r 90"
        } else if (/^(?:repos|rest|r)\s*(\d+)\s*(?:s|sec)?$/i.test(f)) {
          const m = f.match(/(\d+)/);
          if (m) restSeconds = parseInt(m[1]);
        } else if (/^(\d+)\s*(?:s|sec)\s*(?:repos|rest)?$/i.test(f)) {
          const m = f.match(/^(\d+)/);
          if (m) restSeconds = parseInt(m[1]);

        // Tempo: "tempo X-X-X-X" or just "X-X-X-X"
        } else if (/^(?:tempo\s*)?\d+-\d+-\d+-\d+$/i.test(f)) {
          tempo = f.replace(/^tempo\s*/i, "").trim();

        // Anything else is a coach cue / indication
        } else if (f.length > 0) {
          coachCue = f;
        }
      }
    } else {
      // No pipe — try old free-form for backwards compat
      const freeMatch = line.match(/^(.+?)\s+(\d+)[xX×](\d+(?:-\d+)?(?:s)?)\s*(?:@\s*(\d+(?:[.,]\d+)?)\s*kg)?(?:\s+(?:repos\s*)?(\d+)\s*s)?$/i);
      if (freeMatch) {
        const d = parseDosage(`${freeMatch[2]}x${freeMatch[3]}`);
        sets = d.sets; reps = d.reps; isDuration = d.isDuration;
        if (freeMatch[4]) loadKg = parseFloat(freeMatch[4].replace(",", "."));
        if (freeMatch[5]) restSeconds = parseInt(freeMatch[5]);
      }
    }

    const match = matchExercise(rawName, exercises);

    currentBlock.exercises.push({
      rawName,
      sets: isNaN(sets) ? 1 : sets,
      reps: reps || "8",
      isDuration,
      loadKg: isNaN(loadKg) ? 0 : loadKg,
      restSeconds: isNaN(restSeconds) ? 90 : restSeconds,
      tempo,
      coachCue,
      ...match,
    });
  }

  return blocks.filter(b => b.exercises.length > 0);
}

// ─── Convert to BlockDraft[] ──────────────────────────────────────────────────

function parsedBlocksToBlockDrafts(parsedBlocks: ParsedBlock[]): BlockDraft[] {
  return parsedBlocks.map((pb, bIdx) => {
    const block = emptyBlock(bIdx, pb.blockType);
    block.name = pb.blockLabel || BLOCK_TYPE_META[pb.blockType].label;
    block.estimatedDurationMin = pb.durationMin;
    block.exercises = pb.exercises
      .filter(ex => ex.matchedExercise)
      .map((ex, eIdx): ExerciseRow => ({
        exerciseId: ex.matchedExercise!.id,
        exerciseName: ex.matchedExercise!.name,
        orderIndex: eIdx,
        sets: ex.sets,
        reps: ex.reps,
        loadKg: ex.loadKg,
        restSeconds: ex.restSeconds,
        coachCue: ex.coachCue,
        tempo: ex.tempo,
      }));
    return block;
  });
}

// ─── ExerciseMatchRow ─────────────────────────────────────────────────────────

interface ExerciseMatchRowProps {
  item: ParsedExercise;
  blockType: BlockType;
  globalIndex: number;
  allExercises: ExerciseData[];
  onChange: (globalIndex: number, patch: Partial<ParsedExercise>) => void;
  onExerciseCreated: (exercise: ExerciseData) => void;
}

const EXERCISE_CATEGORIES = [
  { value: "compound", label: "Compound" },
  { value: "isolation", label: "Isolation" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Gainage / Core" },
  { value: "mobility", label: "Mobilité" },
  { value: "power", label: "Puissance" },
  { value: "plyometric", label: "Pliométrie" },
  { value: "force", label: "Force" },
] as const;

function ExerciseMatchRow({ item, blockType, globalIndex, allExercises, onChange, onExerciseCreated }: ExerciseMatchRowProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState<string>("compound");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleOpenCreateForm = () => {
    setCreateName(searchQuery);
    setCreateCategory("compound");
    setCreateError(null);
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateError(null);
  };

  const handleCreateExercise = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: createName.trim(), category: createCategory }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: { message?: string } }).error?.message ?? "Erreur lors de la création");
      }
      const newExercise: ExerciseData = await res.json();
      onExerciseCreated(newExercise);
      onChange(globalIndex, { matchedExercise: newExercise, status: "matched" });
      setShowCreateForm(false);
      setShowSearch(false);
      setSearchQuery("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const profile = blockProfile(blockType);

  const filtered = searchQuery.length > 1
    ? allExercises
        .map(ex => ({ ex, score: fuzzyScore(searchQuery, ex.name) }))
        .filter(({ score }) => score > 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ ex }) => ex)
    : item.matchCandidates.slice(0, 5);

  const selectExercise = (ex: ExerciseData) => {
    onChange(globalIndex, { matchedExercise: ex, status: "matched" });
    setShowSearch(false);
    setSearchQuery("");
  };

  const dismiss = () => onChange(globalIndex, { matchedExercise: null, status: "unmatched" });

  const isResolved = item.status === "matched" && item.matchedExercise;

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 transition-colors",
      isResolved
        ? "border-emerald-500/30 bg-emerald-500/5"
        : item.status === "unmatched"
        ? "border-destructive/30 bg-destructive/5"
        : "border-amber-500/30 bg-amber-500/5"
    )}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          {isResolved
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : item.status === "unmatched"
            ? <AlertCircle className="w-4 h-4 text-destructive" />
            : <AlertCircle className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono truncate">"{item.rawName}"</p>
          {item.matchedExercise ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <ChevronRight className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-sm text-white font-medium truncate">{item.matchedExercise.name}</span>
              <button type="button" onClick={dismiss} className="ml-auto p-0.5 rounded hover:bg-white/10 shrink-0">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Aucun exercice trouvé</p>
          )}
        </div>
      </div>

      {/* Inline fields */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <InlineField label="Séries">
          <input type="number" min={1} max={20} value={item.sets}
            onChange={e => onChange(globalIndex, { sets: parseInt(e.target.value) || 1 })}
            className="w-8 bg-transparent text-white text-center outline-none" />
        </InlineField>

        <InlineField label={profile.repsLabel}>
          <input value={item.reps}
            onChange={e => onChange(globalIndex, { reps: e.target.value })}
            className="w-14 bg-transparent text-white text-center outline-none" />
        </InlineField>

        {profile.showLoad && (
          <InlineField label="Charge" suffix="kg">
            <input type="number" min={0} step={0.5} value={item.loadKg}
              onChange={e => onChange(globalIndex, { loadKg: parseFloat(e.target.value) || 0 })}
              className="w-12 bg-transparent text-white text-center outline-none" />
          </InlineField>
        )}

        <InlineField label="Repos" suffix="s">
          <input type="number" min={0} step={5} value={item.restSeconds}
            onChange={e => onChange(globalIndex, { restSeconds: parseInt(e.target.value) || 0 })}
            className="w-12 bg-transparent text-white text-center outline-none" />
        </InlineField>

        {profile.showTempo && (
          <InlineField label="Tempo">
            <input value={item.tempo}
              onChange={e => onChange(globalIndex, { tempo: e.target.value })}
              placeholder="—"
              className="w-16 bg-transparent text-white text-center outline-none placeholder:text-muted-foreground/40" />
          </InlineField>
        )}

        {profile.showCoachCue && item.coachCue && (
          <InlineField label="Indication">
            <input value={item.coachCue}
              onChange={e => onChange(globalIndex, { coachCue: e.target.value })}
              className="w-28 bg-transparent text-white outline-none" />
          </InlineField>
        )}
      </div>

      {/* Candidates / search */}
      {(item.status !== "matched" || !item.matchedExercise) && (
        <div className="space-y-1.5">
          {!showSearch && item.matchCandidates.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggestions :</p>
              {item.matchCandidates.slice(0, 4).map(ex => (
                <button key={ex.id} type="button" onClick={() => selectExercise(ex)}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-white transition-colors flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                  {ex.name}
                  {ex.category && <span className="ml-auto text-muted-foreground text-[10px]">{ex.category}</span>}
                </button>
              ))}
            </div>
          )}

          <button type="button" onClick={() => setShowSearch(s => !s)}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
            <Search className="w-3 h-3" />
            {showSearch ? "Fermer la recherche" : "Rechercher manuellement"}
          </button>

          {showSearch && (
            <div className="space-y-1">
              {!showCreateForm && (
                <Input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un exercice…"
                  className="h-7 text-xs bg-background border-border" />
              )}
              {!showCreateForm && (
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {filtered.map(ex => (
                    <button key={ex.id} type="button" onClick={() => selectExercise(ex)}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-xs text-white flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                      {ex.name}
                      {ex.category && <span className="ml-auto text-muted-foreground text-[10px]">{ex.category}</span>}
                    </button>
                  ))}
                  {filtered.length === 0 && searchQuery.length > 1 && (
                    <div className="py-1.5 space-y-1.5">
                      <p className="text-center text-xs text-muted-foreground">Aucun résultat</p>
                      <button
                        type="button"
                        onClick={handleOpenCreateForm}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors text-xs text-primary"
                      >
                        <Plus className="w-3 h-3" />
                        Créer «{searchQuery}»
                      </button>
                    </div>
                  )}
                </div>
              )}

              {showCreateForm && (
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                  <p className="text-[10px] text-primary uppercase tracking-wider font-medium">Nouvel exercice</p>
                  <Input
                    autoFocus
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Nom de l'exercice…"
                    className="h-7 text-xs bg-background border-border"
                  />
                  <select
                    value={createCategory}
                    onChange={e => setCreateCategory(e.target.value)}
                    className="w-full h-7 rounded-md border border-border bg-background text-xs text-white px-2 outline-none focus:border-primary/50"
                  >
                    {EXERCISE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {createError && (
                    <p className="text-[10px] text-destructive">{createError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelCreate}
                      disabled={creating}
                      className="flex-1 h-7 rounded text-xs text-muted-foreground hover:text-white border border-border hover:border-white/30 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateExercise}
                      disabled={creating || !createName.trim()}
                      className="flex-1 h-7 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                    >
                      {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Créer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InlineField({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 bg-background/60 rounded px-2 py-1 shrink-0">
      <span className="text-muted-foreground text-[10px]">{label}</span>
      {children}
      {suffix && <span className="text-muted-foreground text-[10px]">{suffix}</span>}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface SessionImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (blocks: BlockDraft[]) => void;
}

type Step = "input" | "review";

const EXAMPLE_TEXT = `[BLOC] Échauffement | 6min
Montées de genoux sur place | 30s | Respiration ample
Talons-fesses | 30s

[BLOC] Force | 18min
Squat | 4x8 | 80kg | repos 90s | tempo 3-1-1-0
Fente bulgare | 3x10 | PDC | repos 60s

[BLOC] Gainage/Core | 6min
Planche | 3x45s | repos 60s | Gainage serré`;

export function SessionImportModal({ open, onClose, onImport }: SessionImportModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();
  const convertMutation = useConvertSessionTextWithAi();

  const { data: exercises } = useGetExercises(
    {},
    { query: { queryKey: ["/api/exercises", "import"], enabled: open } }
  );
  const [extraExercises, setExtraExercises] = useState<ExerciseData[]>([]);
  const allExercises = [...(exercises || []), ...extraExercises];

  const handleExerciseCreated = useCallback((exercise: ExerciseData) => {
    setExtraExercises(prev => [...prev, exercise]);
  }, []);

  // Flat index helpers — we store a flat list for easy onChange
  const flatExercises = parsedBlocks.flatMap(b => b.exercises);
  const matchedCount = flatExercises.filter(e => e.matchedExercise).length;
  const totalCount = flatExercises.length;
  const unmatchedCount = totalCount - matchedCount;

  const handleAiConvert = useCallback(async () => {
    if (!text.trim()) return;
    try {
      const result = await convertMutation.mutateAsync({ data: { text } });
      setText(result.convertedText);
      toast({ title: "Texte reformaté par l'IA — vérifie le résultat avant d'analyser." });
    } catch (err: any) {
      const isNotConfigured = err?.status === 503;
      toast({
        title: isNotConfigured ? "Conversion IA indisponible sur ce serveur" : "Échec de la conversion IA",
        description: isNotConfigured ? undefined : "Tu peux toujours coller ta séance au format attendu ci-dessous.",
        variant: "destructive",
      });
    }
  }, [text, convertMutation, toast]);

  const handleParse = useCallback(() => {
    if (!text.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      const result = parseSessionText(text, allExercises);
      setParsedBlocks(result);
      setStep("review");
      setIsParsing(false);
    }, 200);
  }, [text, allExercises]);

  // globalIndex maps into flatExercises
  const handleChange = useCallback((globalIndex: number, patch: Partial<ParsedExercise>) => {
    setParsedBlocks(prev => {
      let idx = 0;
      return prev.map(block => ({
        ...block,
        exercises: block.exercises.map(ex => {
          const current = idx++;
          return current === globalIndex ? { ...ex, ...patch } : ex;
        }),
      }));
    });
  }, []);

  const handleConfirm = () => {
    const blocks = parsedBlocksToBlockDrafts(parsedBlocks);
    onImport(blocks);
    handleClose();
  };

  const handleClose = () => {
    setStep("input");
    setText("");
    setParsedBlocks([]);
    setExtraExercises([]);
    onClose();
  };

  // Compute globalIndex offset per block for rendering
  const blockOffsets: number[] = [];
  let offset = 0;
  for (const b of parsedBlocks) {
    blockOffsets.push(offset);
    offset += b.exercises.length;
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 font-display text-xl tracking-widest text-white">
            <FileText className="w-5 h-5 text-primary" />
            Importer par texte
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Input ── */}
        {step === "input" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-2">
              <p className="font-medium text-white">Format attendu :</p>
              <pre className="text-primary/80 font-mono leading-relaxed text-[11px] whitespace-pre-wrap">{`[BLOC] Échauffement | 6min
Montées de genoux sur place | 30s | Respiration ample

[BLOC] Force | 18min
Squat | 4x8 | 80kg | repos 90s | tempo 3-1-1-0

[BLOC] Gainage/Core | 6min
Planche | 3x45s | repos 60s | Gainage serré`}</pre>
              <p className="text-muted-foreground text-[10px]">
                Blocs disponibles : Échauffement · Force · Puissance · Conditioning · Gainage/Core · Mobilité · Activation · Technique · Pliométrie · HIIT · Récupération
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Colle ta séance ici</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAiConvert}
                    disabled={!text.trim() || convertMutation.isPending}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {convertMutation.isPending
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />}
                    Reformater avec l'IA
                  </button>
                  <button type="button" onClick={() => setText(EXAMPLE_TEXT)}
                    className="text-[10px] text-primary hover:text-primary/80 transition-colors">
                    Charger l'exemple
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={EXAMPLE_TEXT}
                rows={12}
                className="w-full rounded-lg border border-border bg-background text-sm text-white placeholder:text-muted-foreground/40 p-3 resize-none outline-none focus:border-primary/50 transition-colors font-mono leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground">
                {text.split("\n").filter(l => l.trim()).length} ligne(s) · {text.split("\n").filter(l => /^\[BLOC\]/i.test(l.trim())).length} bloc(s)
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="border-border" onClick={handleClose}>Annuler</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleParse}
                disabled={!text.trim() || isParsing || allExercises.length === 0}
              >
                {isParsing
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyse…</>
                  : <><ClipboardPaste className="w-4 h-4 mr-2" />Analyser la séance</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === "review" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-400 font-medium">{matchedCount}/{totalCount} reconnus</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-border">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{parsedBlocks.length} bloc{parsedBlocks.length > 1 ? "s" : ""}</span>
              </div>
              {unmatchedCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-amber-400 font-medium">{unmatchedCount} à corriger</span>
                </div>
              )}
              <button type="button" onClick={() => setStep("input")}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
                <RotateCcw className="w-3 h-3" />
                Modifier le texte
              </button>
            </div>

            {/* Blocks */}
            <div className="space-y-4">
              {parsedBlocks.map((pb, bIdx) => {
                const meta = BLOCK_TYPE_META[pb.blockType];
                const Icon = meta.icon;
                const blockOffset = blockOffsets[bIdx];
                const blockMatched = pb.exercises.filter(e => e.matchedExercise).length;
                return (
                  <div key={bIdx} className={cn("rounded-xl border overflow-hidden", meta.border, meta.bg)}>
                    <div className={cn("flex items-center gap-2 px-3 py-2")}>
                      <Icon className={cn("w-4 h-4 shrink-0", meta.color)} />
                      <span className={cn("text-sm font-semibold", meta.color)}>{pb.blockLabel}</span>
                      <span className="text-xs text-muted-foreground">{pb.durationMin}min</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {blockMatched}/{pb.exercises.length}
                      </span>
                    </div>
                    <div className="px-3 pb-3 pt-1 space-y-2">
                      {pb.exercises.map((ex, eIdx) => (
                        <ExerciseMatchRow
                          key={eIdx}
                          item={ex}
                          blockType={pb.blockType}
                          globalIndex={blockOffset + eIdx}
                          allExercises={allExercises}
                          onChange={handleChange}
                          onExerciseCreated={handleExerciseCreated}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {unmatchedCount > 0 && (
              <p className="text-xs text-amber-400/80 text-center">
                Les exercices non appariés seront ignorés à l'import.
              </p>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" className="border-border" onClick={handleClose}>Annuler</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleConfirm}
                disabled={matchedCount === 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Importer {matchedCount} exercice{matchedCount > 1 ? "s" : ""} en {parsedBlocks.length} bloc{parsedBlocks.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
