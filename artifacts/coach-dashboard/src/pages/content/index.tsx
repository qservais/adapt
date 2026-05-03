import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { customFetch } from "@workspace/api-client-react";

interface Guide {
  id: string;
  title: string;
  contentMarkdown: string;
  category: string | null;
  sortOrder: number | null;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number | null;
  exercises: { name: string; sets?: string; notes?: string }[];
}

const GUIDE_CATEGORY_VALUES = ["", "training", "nutrition", "recovery", "mindset"] as const;
const ROUTINE_CATEGORY_VALUES = ["warmup", "reathletisation", "relaxation", "breathing"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  training: "text-[#00F0FF]",
  nutrition: "text-[#22C55E]",
  recovery: "text-[#A855F7]",
  mindset: "text-[#F59E0B]",
  warmup: "text-[#F59E0B]",
  reathletisation: "text-[#00F0FF]",
  relaxation: "text-[#A855F7]",
  breathing: "text-[#22C55E]",
};

export default function ContentPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"guides" | "routines">("guides");

  const [guideDialog, setGuideDialog] = useState<{ open: boolean; guide?: Guide }>({ open: false });
  const [deleteGuideId, setDeleteGuideId] = useState<string | null>(null);
  const [routineDialog, setRoutineDialog] = useState<{ open: boolean; routine?: Routine }>({ open: false });
  const [deleteRoutineId, setDeleteRoutineId] = useState<string | null>(null);

  const [guideTitle, setGuideTitle] = useState("");
  const [guideContent, setGuideContent] = useState("");
  const [guideCategory, setGuideCategory] = useState("");
  const [guideSortOrder, setGuideSortOrder] = useState("0");

  const [routineTitle, setRoutineTitle] = useState("");
  const [routineDesc, setRoutineDesc] = useState("");
  const [routineCategory, setRoutineCategory] = useState("warmup");
  const [routineDuration, setRoutineDuration] = useState("");
  const [routineExercisesRaw, setRoutineExercisesRaw] = useState("");

  const guidesQuery = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
    queryFn: () => customFetch("/api/guides"),
  });

  const routinesQuery = useQuery<Routine[]>({
    queryKey: ["/api/content-routines"],
    queryFn: () => customFetch("/api/content-routines"),
  });

  const saveGuideMutation = useMutation({
    mutationFn: (data: { id?: string; title: string; contentMarkdown: string; category: string | null; sortOrder: number }) =>
      data.id
        ? customFetch(`/api/guides/${data.id}`, { method: "PUT", body: JSON.stringify(data) })
        : customFetch("/api/guides", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      setGuideDialog({ open: false });
      toast({ title: t("content.guide_saved") });
    },
    onError: () => toast({ title: t("content.error_save"), variant: "destructive" }),
  });

  const deleteGuideMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/guides/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      setDeleteGuideId(null);
      toast({ title: t("content.guide_deleted") });
    },
    onError: () => toast({ title: t("content.error_delete"), variant: "destructive" }),
  });

  const saveRoutineMutation = useMutation({
    mutationFn: (data: { id?: string; title: string; description: string | null; category: string; durationMin: number | null; exercises: unknown[] }) =>
      data.id
        ? customFetch(`/api/content-routines/${data.id}`, { method: "PUT", body: JSON.stringify(data) })
        : customFetch("/api/content-routines", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-routines"] });
      setRoutineDialog({ open: false });
      toast({ title: t("content.routine_saved") });
    },
    onError: () => toast({ title: t("content.error_save"), variant: "destructive" }),
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/content-routines/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-routines"] });
      setDeleteRoutineId(null);
      toast({ title: t("content.routine_deleted") });
    },
    onError: () => toast({ title: t("content.error_delete"), variant: "destructive" }),
  });

  function openNewGuide() {
    setGuideTitle("");
    setGuideContent("");
    setGuideCategory("");
    setGuideSortOrder("0");
    setGuideDialog({ open: true });
  }

  function openEditGuide(guide: Guide) {
    setGuideTitle(guide.title);
    setGuideContent(guide.contentMarkdown);
    setGuideCategory(guide.category ?? "");
    setGuideSortOrder(String(guide.sortOrder ?? 0));
    setGuideDialog({ open: true, guide });
  }

  function handleSaveGuide() {
    saveGuideMutation.mutate({
      id: guideDialog.guide?.id,
      title: guideTitle.trim(),
      contentMarkdown: guideContent,
      category: guideCategory || null,
      sortOrder: parseInt(guideSortOrder, 10) || 0,
    });
  }

  function openNewRoutine() {
    setRoutineTitle("");
    setRoutineDesc("");
    setRoutineCategory("warmup");
    setRoutineDuration("");
    setRoutineExercisesRaw("");
    setRoutineDialog({ open: true });
  }

  function openEditRoutine(routine: Routine) {
    setRoutineTitle(routine.title);
    setRoutineDesc(routine.description ?? "");
    setRoutineCategory(routine.category);
    setRoutineDuration(routine.durationMin != null ? String(routine.durationMin) : "");
    setRoutineExercisesRaw(
      routine.exercises.map(ex => `${ex.name}${ex.sets ? ` | ${ex.sets}` : ""}${ex.notes ? ` | ${ex.notes}` : ""}`).join("\n")
    );
    setRoutineDialog({ open: true, routine });
  }

  function parseExercises(raw: string): { name: string; sets?: string; notes?: string }[] {
    return raw
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split("|").map(p => p.trim());
        return { name: parts[0], sets: parts[1] ?? undefined, notes: parts[2] ?? undefined };
      });
  }

  function handleSaveRoutine() {
    const durationParsed = parseInt(routineDuration, 10);
    saveRoutineMutation.mutate({
      id: routineDialog.routine?.id,
      title: routineTitle.trim(),
      description: routineDesc.trim() || null,
      category: routineCategory,
      durationMin: !isNaN(durationParsed) && durationParsed > 0 ? durationParsed : null,
      exercises: parseExercises(routineExercisesRaw),
    });
  }

  const guides = guidesQuery.data ?? [];
  const routines = routinesQuery.data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-wider text-white">{t("content.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("content.subtitle")}
          </p>
        </div>
        <Button
          onClick={activeTab === "guides" ? openNewGuide : openNewRoutine}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "guides" ? "Nouveau guide" : "Nouvelle routine"}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {(["guides", "routines"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab
                ? "text-[#00F0FF] border-b-2 border-[#00F0FF]"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {tab === "guides" ? <BookOpen className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            {tab === "guides" ? "Guides" : "Routines"}
          </button>
        ))}
      </div>

      {activeTab === "guides" && (
        <div className="space-y-3">
          {guidesQuery.isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {guides.map(guide => {
            const catLabel = guide.category ? t(`content.cat_${guide.category}` as const) : undefined;
            const catColor = CATEGORY_COLORS[guide.category ?? ""] ?? "text-muted-foreground";
            return (
              <Card key={guide.id} className="bg-card border-border">
                <CardContent className="flex items-center justify-between p-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{guide.title}</p>
                    {catLabel && (
                      <p className={`text-xs font-mono mt-0.5 ${catColor}`}>{catLabel.toUpperCase()}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEditGuide(guide)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteGuideId(guide.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!guidesQuery.isLoading && guides.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">{t("content.no_guides")}</p>
          )}
        </div>
      )}

      {activeTab === "routines" && (
        <div className="space-y-3">
          {routinesQuery.isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {routines.map(routine => {
            const catLabel = t(`content.cat_${routine.category}` as const, routine.category);
            const catColor = CATEGORY_COLORS[routine.category] ?? "text-muted-foreground";
            return (
              <Card key={routine.id} className="bg-card border-border">
                <CardContent className="flex items-center justify-between p-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{routine.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className={`text-xs font-mono ${catColor}`}>{catLabel.toUpperCase()}</p>
                      {routine.durationMin != null && (
                        <p className="text-xs text-muted-foreground">{routine.durationMin} min</p>
                      )}
                      <p className="text-xs text-muted-foreground">{routine.exercises.length} exercices</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEditRoutine(routine)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteRoutineId(routine.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!routinesQuery.isLoading && routines.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">{t("content.no_routines")}</p>
          )}
        </div>
      )}

      <Dialog open={guideDialog.open} onOpenChange={open => setGuideDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{guideDialog.guide ? "Modifier le guide" : "Nouveau guide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Titre</Label>
              <Input value={guideTitle} onChange={e => setGuideTitle(e.target.value)} placeholder="Comprendre le RPE…" className="mt-1" />
            </div>
            <div>
              <Label>{t("content.label_category_short")}</Label>
              <select
                value={guideCategory}
                onChange={e => setGuideCategory(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                {GUIDE_CATEGORY_VALUES.map(v => (
                  <option key={v} value={v}>{v === "" ? t("content.cat_none") : t(`content.cat_${v}` as const)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("content.label_sort_display")}</Label>
              <Input value={guideSortOrder} onChange={e => setGuideSortOrder(e.target.value)} type="number" className="mt-1 w-24" />
            </div>
            <div>
              <Label>Contenu (Markdown)</Label>
              <Textarea
                value={guideContent}
                onChange={e => setGuideContent(e.target.value)}
                placeholder="# Titre&#10;## Section&#10;Paragraphe…"
                className="mt-1 font-mono text-sm min-h-[300px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuideDialog({ open: false })}>Annuler</Button>
            <Button onClick={handleSaveGuide} disabled={!guideTitle.trim() || saveGuideMutation.isPending}>
              {saveGuideMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={routineDialog.open} onOpenChange={open => setRoutineDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{routineDialog.routine ? "Modifier la routine" : "Nouvelle routine"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Titre</Label>
              <Input value={routineTitle} onChange={e => setRoutineTitle(e.target.value)} placeholder={t("content.placeholder_routine_title")} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={routineDesc} onChange={e => setRoutineDesc(e.target.value)} placeholder={t("content.placeholder_routine_desc")} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("content.label_category_short")}</Label>
                <select
                  value={routineCategory}
                  onChange={e => setRoutineCategory(e.target.value)}
                  className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  {ROUTINE_CATEGORY_VALUES.map(v => (
                    <option key={v} value={v}>{t(`content.cat_${v}` as const)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("content.label_duration_short")}</Label>
                <Input value={routineDuration} onChange={e => setRoutineDuration(e.target.value)} type="number" placeholder="10" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>{t("content.label_exercises_one_per_line")}</Label>
              <p className="text-xs text-muted-foreground mb-1">{t("content.exercises_format_hint")}</p>
              <Textarea
                value={routineExercisesRaw}
                onChange={e => setRoutineExercisesRaw(e.target.value)}
                placeholder={t("content.placeholder_exercises")}
                className="mt-1 font-mono text-sm min-h-[180px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutineDialog({ open: false })}>Annuler</Button>
            <Button onClick={handleSaveRoutine} disabled={!routineTitle.trim() || !routineCategory || saveRoutineMutation.isPending}>
              {saveRoutineMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteGuideId != null} onOpenChange={open => !open && setDeleteGuideId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce guide ?</AlertDialogTitle>
            <AlertDialogDescription>{t("content.delete_irreversible")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteGuideId && deleteGuideMutation.mutate(deleteGuideId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRoutineId != null} onOpenChange={open => !open && setDeleteRoutineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette routine ?</AlertDialogTitle>
            <AlertDialogDescription>{t("content.delete_irreversible")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRoutineId && deleteRoutineMutation.mutate(deleteRoutineId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
