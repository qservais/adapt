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
} from "lucide-react";
import { cn } from "@/components/ui/mode-badge";
import { useGetExercises, ExerciseData } from "@workspace/api-client-react";
import { BlockDraft, ExerciseRow, emptyBlock } from "./program-editor";

interface ParsedExercise {
  rawName: string;
  sets: number;
  reps: string;
  loadKg: number;
  restSeconds: number;
  matchedExercise: ExerciseData | null;
  matchCandidates: ExerciseData[];
  status: "matched" | "ambiguous" | "unmatched";
}

interface ImportResult {
  exercises: ParsedExercise[];
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 1;
  if (t.includes(q) || q.includes(t)) return 0.85;
  const dist = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  return Math.max(0, 1 - dist / maxLen);
}

function findMatches(name: string, exercises: ExerciseData[]): ExerciseData[] {
  return exercises
    .map(ex => ({ ex, score: fuzzyScore(name, ex.name) }))
    .filter(({ score }) => score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ ex }) => ex);
}

function parseText(text: string, exercises: ExerciseData[]): ParsedExercise[] {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const results: ParsedExercise[] = [];

  for (const line of lines) {
    const cleaned = line
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^[-•*]\s*/, "")
      .trim();

    if (!cleaned) continue;

    let rawName = cleaned;
    let sets = 3;
    let reps = "8-10";
    let loadKg = 0;
    let restSeconds = 90;

    const patternFree = /^(.+?)\s+(\d+)[xX×](\d+(?:-\d+)?(?:er?s?)?)(?:\s*[@à]\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?)?(?:\s+(\d+)\s*(?:s|sec|'|min))?$/i;
    const matchFree = cleaned.match(patternFree);

    const patternDash = /^(.+?)\s*[-–]\s*(\d+)\s*(?:s[eé]ries?|sets?)?\s*[-–]\s*(\d+(?:-\d+)?)\s*(?:reps?|r[eé]p[eé]titions?)?\s*(?:[-–]\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?)?(?:\s+(\d+)\s*(?:s|sec))?$/i;
    const matchDash = cleaned.match(patternDash);

    if (matchFree) {
      rawName = matchFree[1].trim();
      sets = parseInt(matchFree[2]);
      reps = matchFree[3];
      if (matchFree[4]) loadKg = parseFloat(matchFree[4].replace(",", "."));
      if (matchFree[5]) restSeconds = parseInt(matchFree[5]);
    } else if (matchDash) {
      rawName = matchDash[1].trim();
      sets = parseInt(matchDash[2]);
      reps = matchDash[3];
      if (matchDash[4]) loadKg = parseFloat(matchDash[4].replace(",", "."));
      if (matchDash[5]) restSeconds = parseInt(matchDash[5]);
    } else {
      const loadMatch = cleaned.match(/[@à]\s*(\d+(?:[.,]\d+)?)\s*kg/i);
      if (loadMatch) loadKg = parseFloat(loadMatch[1].replace(",", "."));
      const setsMatch = cleaned.match(/(\d+)\s*(?:x|×|s[eé]ries?|sets?)/i);
      if (setsMatch) sets = parseInt(setsMatch[1]);
      const repsMatch = cleaned.match(/\d+\s*[xX×]\s*(\d+(?:-\d+)?)/i);
      if (repsMatch) reps = repsMatch[1];
      rawName = cleaned
        .replace(/[@à]\s*\d+(?:[.,]\d+)?\s*kg/gi, "")
        .replace(/\d+\s*[xX×]\s*\d+(?:-\d+)?/g, "")
        .replace(/\d+\s*(?:s[eé]ries?|sets?)/gi, "")
        .replace(/\d+\s*(?:reps?|r[eé]p[eé]titions?)/gi, "")
        .replace(/\d+\s*(?:s|sec)/gi, "")
        .trim()
        .replace(/[-–,;]+$/, "")
        .trim();
    }

    if (!rawName) continue;

    const candidates = findMatches(rawName, exercises);
    const best = candidates[0];
    const bestScore = best ? fuzzyScore(rawName, best.name) : 0;

    let status: ParsedExercise["status"] = "unmatched";
    let matchedExercise: ExerciseData | null = null;

    if (bestScore >= 0.85) {
      status = "matched";
      matchedExercise = best;
    } else if (bestScore >= 0.45 && candidates.length > 0) {
      status = "ambiguous";
    }

    results.push({
      rawName,
      sets: isNaN(sets) ? 3 : sets,
      reps: reps || "8-10",
      loadKg: isNaN(loadKg) ? 0 : loadKg,
      restSeconds: isNaN(restSeconds) ? 90 : restSeconds,
      matchedExercise,
      matchCandidates: candidates,
      status,
    });
  }

  return results;
}

function importToBlocks(parsed: ParsedExercise[]): BlockDraft[] {
  const block = emptyBlock(0, "strength");
  block.exercises = parsed
    .filter(p => p.matchedExercise)
    .map((p, i): ExerciseRow => ({
      exerciseId: p.matchedExercise!.id,
      exerciseName: p.matchedExercise!.name,
      orderIndex: i,
      sets: p.sets,
      reps: p.reps,
      loadKg: p.loadKg,
      restSeconds: p.restSeconds,
      coachCue: "",
      tempo: "",
    }));
  return [block];
}

interface ExerciseMatchRowProps {
  item: ParsedExercise;
  index: number;
  allExercises: ExerciseData[];
  onChange: (index: number, patch: Partial<ParsedExercise>) => void;
}

function ExerciseMatchRow({ item, index, allExercises, onChange }: ExerciseMatchRowProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filtered = searchQuery.length > 1
    ? allExercises
        .map(ex => ({ ex, score: fuzzyScore(searchQuery, ex.name) }))
        .filter(({ score }) => score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ ex }) => ex)
    : item.matchCandidates.slice(0, 5);

  const selectExercise = (ex: ExerciseData) => {
    onChange(index, { matchedExercise: ex, status: "matched" });
    setShowSearch(false);
    setSearchQuery("");
  };

  const dismiss = () => {
    onChange(index, { matchedExercise: null, status: "unmatched" });
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 transition-colors",
      item.status === "matched" && item.matchedExercise
        ? "border-emerald-500/30 bg-emerald-500/5"
        : item.status === "unmatched"
        ? "border-destructive/30 bg-destructive/5"
        : "border-amber-500/30 bg-amber-500/5"
    )}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          {item.status === "matched" && item.matchedExercise ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : item.status === "unmatched" ? (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono truncate">"{item.rawName}"</p>
          {item.matchedExercise ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <ChevronRight className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-sm text-white font-medium truncate">{item.matchedExercise.name}</span>
              <button
                type="button"
                onClick={dismiss}
                className="ml-auto p-0.5 rounded hover:bg-white/10 shrink-0"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Aucun exercice trouvé</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 bg-background/60 rounded px-2 py-1">
          <span className="text-muted-foreground">Séries</span>
          <input
            type="number"
            min={1}
            max={20}
            value={item.sets}
            onChange={e => onChange(index, { sets: parseInt(e.target.value) || 1 })}
            className="w-8 bg-transparent text-white text-center outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-background/60 rounded px-2 py-1">
          <span className="text-muted-foreground">Reps</span>
          <input
            value={item.reps}
            onChange={e => onChange(index, { reps: e.target.value })}
            className="w-12 bg-transparent text-white text-center outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-background/60 rounded px-2 py-1">
          <span className="text-muted-foreground">Charge</span>
          <input
            type="number"
            min={0}
            value={item.loadKg}
            onChange={e => onChange(index, { loadKg: parseFloat(e.target.value) || 0 })}
            className="w-12 bg-transparent text-white text-center outline-none"
          />
          <span className="text-muted-foreground">kg</span>
        </div>
        <div className="flex items-center gap-1 bg-background/60 rounded px-2 py-1">
          <span className="text-muted-foreground">Repos</span>
          <input
            type="number"
            min={0}
            value={item.restSeconds}
            onChange={e => onChange(index, { restSeconds: parseInt(e.target.value) || 0 })}
            className="w-12 bg-transparent text-white text-center outline-none"
          />
          <span className="text-muted-foreground">s</span>
        </div>
      </div>

      {(item.status === "ambiguous" || item.status === "unmatched" || showSearch) && (
        <div className="space-y-1.5">
          {!showSearch && item.matchCandidates.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Choisir :</p>
              {item.matchCandidates.slice(0, 4).map(ex => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => selectExercise(ex)}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-white transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                  {ex.name}
                  {ex.category && <span className="ml-auto text-muted-foreground text-[10px]">{ex.category}</span>}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSearch(s => !s)}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            <Search className="w-3 h-3" />
            {showSearch ? "Fermer la recherche" : "Rechercher manuellement"}
          </button>

          {showSearch && (
            <div className="space-y-1">
              <Input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un exercice..."
                className="h-7 text-xs bg-background border-border"
              />
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {filtered.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => selectExercise(ex)}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-white/10 text-xs text-white flex items-center gap-2"
                  >
                    <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                    {ex.name}
                    {ex.category && <span className="ml-auto text-muted-foreground text-[10px]">{ex.category}</span>}
                  </button>
                ))}
                {filtered.length === 0 && searchQuery.length > 1 && (
                  <p className="text-center py-2 text-xs text-muted-foreground">Aucun résultat</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SessionImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (blocks: BlockDraft[]) => void;
}

type Step = "input" | "review";

export function SessionImportModal({ open, onClose, onImport }: SessionImportModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedExercise[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const { data: exercises } = useGetExercises(
    {},
    { query: { queryKey: ["/api/exercises", "import"], enabled: open } }
  );
  const allExercises = exercises || [];

  const handleParse = useCallback(() => {
    if (!text.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      const result = parseText(text, allExercises);
      setParsed(result);
      setStep("review");
      setIsParsing(false);
    }, 300);
  }, [text, allExercises]);

  const handleChange = useCallback((index: number, patch: Partial<ParsedExercise>) => {
    setParsed(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  }, []);

  const handleConfirm = () => {
    const blocks = importToBlocks(parsed);
    onImport(blocks);
    handleClose();
  };

  const handleClose = () => {
    setStep("input");
    setText("");
    setParsed([]);
    onClose();
  };

  const matchedCount = parsed.filter(p => p.matchedExercise).length;
  const unmatchedCount = parsed.filter(p => !p.matchedExercise).length;

  const EXAMPLE_TEXT = `Squat 4x8 @ 80kg
Développé couché 3x10 @ 70kg
Rowing barre 3x12 @ 60kg
Hip thrust 4x10 @ 100kg`;

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 font-display text-xl tracking-widest text-white">
            <FileText className="w-5 h-5 text-primary" />
            Importer par texte
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-white">Formats acceptés :</p>
                <p>• <span className="font-mono text-primary">Squat 4x8 @ 80kg</span> — nom + séries×reps + charge</p>
                <p>• <span className="font-mono text-primary">1. Squat - 4 séries - 8 reps - 80kg</span> — liste numérotée</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Colle ta séance ici
                </label>
                <button
                  type="button"
                  onClick={() => setText(EXAMPLE_TEXT)}
                  className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  Voir un exemple
                </button>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Squat 4x8 @ 80kg\nDéveloppé couché 3x10 @ 70kg\nRowing barre 3x12 @ 60kg`}
                rows={10}
                className="w-full rounded-lg border border-border bg-background text-sm text-white placeholder:text-muted-foreground p-3 resize-none outline-none focus:border-primary/50 transition-colors font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                {text.split("\n").filter(l => l.trim()).length} ligne(s) détectée(s)
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="border-border" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleParse}
                disabled={!text.trim() || isParsing || allExercises.length === 0}
              >
                {isParsing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyse en cours…</>
                ) : (
                  <><ClipboardPaste className="w-4 h-4 mr-2" />Analyser</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-400 font-medium">{matchedCount} reconnu{matchedCount > 1 ? "s" : ""}</span>
              </div>
              {unmatchedCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-amber-400 font-medium">{unmatchedCount} à corriger</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep("input")}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Modifier le texte
              </button>
            </div>

            <div className="space-y-2">
              {parsed.map((item, i) => (
                <ExerciseMatchRow
                  key={i}
                  item={item}
                  index={i}
                  allExercises={allExercises}
                  onChange={handleChange}
                />
              ))}
            </div>

            {unmatchedCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                Les exercices non appariés (en rouge) seront ignorés à l'import. Assigne-les manuellement ou crée-les dans la bibliothèque.
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" className="border-border" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleConfirm}
                disabled={matchedCount === 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Importer {matchedCount} exercice{matchedCount > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
