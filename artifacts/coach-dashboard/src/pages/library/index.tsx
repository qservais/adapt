import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Pencil, Trash2, Loader2, Dumbbell, Filter, X, CheckCircle, ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/components/ui/mode-badge";

interface ExerciseItem {
  id: string;
  name: string;
  category: string | null;
  muscleGroups: string[] | null;
  equipment: string[] | null;
  description: string | null;
  demoUrl: string | null;
  createdBy: string | null;
}

const CATEGORIES = [
  { value: "compound", label: "Polyarticulaire", color: "text-[#00F0FF]", bg: "bg-[#00F0FF]/10 border-[#00F0FF]/30" },
  { value: "isolation", label: "Isolation", color: "text-[#A855F7]", bg: "bg-[#A855F7]/10 border-[#A855F7]/30" },
  { value: "cardio", label: "Cardio", color: "text-[#00F5A0]", bg: "bg-[#00F5A0]/10 border-[#00F5A0]/30" },
  { value: "mobility", label: "Mobilité", color: "text-[#FFB800]", bg: "bg-[#FFB800]/10 border-[#FFB800]/30" },
  { value: "core", label: "Gainage/Core", color: "text-[#F97316]", bg: "bg-[#F97316]/10 border-[#F97316]/30" },
  { value: "power", label: "Puissance", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10 border-[#EF4444]/30" },
  { value: "plyometric", label: "Pliométrie", color: "text-[#FF8C42]", bg: "bg-[#FF8C42]/10 border-[#FF8C42]/30" },
];

const MUSCLE_GROUPS = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Quadriceps", "Ischio-jambiers",
  "Fessiers", "Mollets", "Abdominaux", "Trapèzes", "Avant-bras", "Corps entier"
];

const EQUIPMENT_LIST = [
  "Haltères", "Barre", "Kettlebell", "Bandes élastiques", "TRX", "Box", "Médecine ball",
  "Foam roller", "Tapis", "Barre de traction", "Machine", "Câbles", "Poids du corps", "Aucun"
];

const getCategoryStyle = (cat: string | null) => {
  return CATEGORIES.find(c => c.value === cat) ?? { color: "text-muted-foreground", bg: "bg-white/5 border-white/10", label: cat ?? "Autre" };
};

async function fetchExercises(q: string, cat: string, muscleGroup: string): Promise<ExerciseItem[]> {
  const token = localStorage.getItem("adapt_coach_access");
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (cat) params.set("category", cat);
  if (muscleGroup) params.set("muscleGroup", muscleGroup);
  const res = await fetch(`/api/exercises?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error();
  return res.json();
}

type ExerciseFormData = {
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  description: string;
  demoUrl: string;
};

const emptyForm = (): ExerciseFormData => ({
  name: "",
  category: "compound",
  muscleGroups: [],
  equipment: [],
  description: "",
  demoUrl: "",
});

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<ExerciseItem | null>(null);
  const [form, setForm] = useState<ExerciseFormData>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ExerciseItem | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: exercises, isLoading } = useQuery<ExerciseItem[]>({
    queryKey: ["/api/exercises", search, categoryFilter, muscleGroupFilter],
    queryFn: () => fetchExercises(search, categoryFilter, muscleGroupFilter),
    staleTime: 10000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExerciseFormData) => {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          category: data.category || undefined,
          muscleGroups: data.muscleGroups.length > 0 ? data.muscleGroups : undefined,
          equipment: data.equipment.length > 0 ? data.equipment : undefined,
          description: data.description || undefined,
          demoUrl: data.demoUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Exercice créé" });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      closeDialog();
    },
    onError: () => toast({ title: "Erreur lors de la création", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExerciseFormData }) => {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/exercises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          category: data.category || undefined,
          muscleGroups: data.muscleGroups.length > 0 ? data.muscleGroups : undefined,
          equipment: data.equipment.length > 0 ? data.equipment : undefined,
          description: data.description || undefined,
          demoUrl: data.demoUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Exercice mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      closeDialog();
    },
    onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/exercises/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Erreur");
      }
    },
    onSuccess: () => {
      toast({ title: "Exercice supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast({ title: err.message || "Erreur lors de la suppression", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditExercise(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (ex: ExerciseItem) => {
    setEditExercise(ex);
    setForm({
      name: ex.name,
      category: ex.category ?? "compound",
      muscleGroups: (ex.muscleGroups as string[]) ?? [],
      equipment: (ex.equipment as string[]) ?? [],
      description: ex.description ?? "",
      demoUrl: ex.demoUrl ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditExercise(null);
    setForm(emptyForm());
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    if (editExercise) {
      updateMutation.mutate({ id: editExercise.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleMultiSelect = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) setter(list.filter(i => i !== item));
    else setter([...list, item]);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const displayedExercises = exercises ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-white">BIBLIOTHÈQUE</h1>
          <p className="text-muted-foreground text-sm">
            {exercises ? `${exercises.length} exercice${exercises.length !== 1 ? "s" : ""}` : "..."} · Créez et organisez vos exercices
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel exercice
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un exercice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              !categoryFilter
                ? "bg-white/10 border-white/20 text-white"
                : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
            )}
          >
            Tous
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(categoryFilter === c.value ? "" : c.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                categoryFilter === c.value
                  ? `${c.bg} ${c.color}`
                  : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Muscle group quick-filter */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono shrink-0">Muscle :</span>
        {["", ...MUSCLE_GROUPS].map(mg => (
          <button
            key={mg}
            onClick={() => setMuscleGroupFilter(mg)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] border transition-colors",
              muscleGroupFilter === mg
                ? "bg-accent/15 border-accent/40 text-accent"
                : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
            )}
          >
            {mg === "" ? "Tous" : mg}
          </button>
        ))}
      </div>

      {/* Exercise grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayedExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <Dumbbell className="w-12 h-12 opacity-20" />
          <p className="text-sm italic">Aucun exercice trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedExercises.map(ex => {
            const catStyle = getCategoryStyle(ex.category);
            const mgs = (ex.muscleGroups as string[]) ?? [];
            return (
              <Card key={ex.id} className="bg-card border-border group hover:border-white/20 transition-colors relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm leading-tight truncate group-hover:text-primary transition-colors">
                        {ex.name}
                      </h3>
                      {ex.category && (
                        <span className={cn("inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border mt-1", catStyle.bg, catStyle.color)}>
                          {catStyle.label}
                        </span>
                      )}
                    </div>
                    {ex.createdBy !== null ? (
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(ex)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(ex)}
                          className="p-1 rounded hover:bg-destructive/20 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                        Global
                      </span>
                    )}
                  </div>

                  {mgs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {mgs.slice(0, 3).map(mg => (
                        <span key={mg} className="text-[9px] bg-white/5 border border-white/10 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                          {mg}
                        </span>
                      ))}
                      {mgs.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{mgs.length - 3}</span>
                      )}
                    </div>
                  )}

                  {((ex.equipment as string[] | null) ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(ex.equipment as string[]).slice(0, 4).map(eq => (
                        <span key={eq} className="text-[9px] bg-accent/10 border border-accent/20 text-accent/80 px-1.5 py-0.5 rounded font-mono">
                          {eq}
                        </span>
                      ))}
                      {(ex.equipment as string[]).length > 4 && (
                        <span className="text-[9px] text-muted-foreground">+{(ex.equipment as string[]).length - 4}</span>
                      )}
                    </div>
                  )}

                  {ex.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {ex.description}
                    </p>
                  )}

                  {ex.demoUrl && (
                    <a
                      href={ex.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 mt-2 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Vidéo démo
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-widest text-white">
              {editExercise ? "MODIFIER L'EXERCICE" : "NOUVEL EXERCICE"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nom *</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Squat barre"
                className="bg-background border-border text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Catégorie</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                      form.category === c.value
                        ? `${c.bg} ${c.color}`
                        : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Groupes musculaires</Label>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map(mg => {
                  const selected = form.muscleGroups.includes(mg);
                  return (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => toggleMultiSelect(form.muscleGroups, mg, v => setForm(f => ({ ...f, muscleGroups: v })))}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors",
                        selected
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
                      )}
                    >
                      {selected && <CheckCircle className="w-3 h-3" />}
                      {mg}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Équipement</Label>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_LIST.map(eq => {
                  const selected = form.equipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleMultiSelect(form.equipment, eq, v => setForm(f => ({ ...f, equipment: v })))}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors",
                        selected
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
                      )}
                    >
                      {selected && <CheckCircle className="w-3 h-3" />}
                      {eq}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description (optionnel)</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Technique d'exécution, points d'attention..."
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Lien vidéo (YouTube, etc.)</Label>
              <Input
                value={form.demoUrl}
                onChange={e => setForm(f => ({ ...f, demoUrl: e.target.value }))}
                placeholder="https://youtube.com/..."
                className="bg-background border-border text-white font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} className="border-border">
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editExercise ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">Supprimer l'exercice ?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              « {deleteTarget?.name} » sera définitivement supprimé. Si cet exercice est utilisé dans des séances, la suppression sera bloquée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
