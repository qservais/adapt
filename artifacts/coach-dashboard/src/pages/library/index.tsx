import { useTranslation } from "react-i18next";
import { EQUIPMENT_CATALOG, EQUIPMENT_CATEGORIES, equipmentKeyFromLabel } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Pencil, Trash2, Loader2, Dumbbell, X, CheckCircle, ExternalLink, CalendarPlus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  level: string | null;
  createdBy: string | null;
}

const CATEGORIES = [
  { value: "force", label: "Force", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10 border-[#F59E0B]/30" },
  { value: "pliométrie", label: "Pliométrie", color: "text-[#FF8C42]", bg: "bg-[#FF8C42]/10 border-[#FF8C42]/30" },
  { value: "cardio", label: "Cardio", color: "text-[#00F5A0]", bg: "bg-[#00F5A0]/10 border-[#00F5A0]/30" },
  { value: "mobilité", label: "Mobilité", color: "text-[#FFB800]", bg: "bg-[#FFB800]/10 border-[#FFB800]/30" },
  { value: "core", label: "Gainage/Core", color: "text-[#F97316]", bg: "bg-[#F97316]/10 border-[#F97316]/30" },
  { value: "réathlétisation", label: "Réathlétisation", color: "text-[#22C55E]", bg: "bg-[#22C55E]/10 border-[#22C55E]/30" },
  { value: "compound", label: "Polyarticulaire", color: "text-[#00F0FF]", bg: "bg-[#00F0FF]/10 border-[#00F0FF]/30" },
  { value: "isolation", label: "Isolation", color: "text-[#A855F7]", bg: "bg-[#A855F7]/10 border-[#A855F7]/30" },
  { value: "power", label: "Puissance", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10 border-[#EF4444]/30" },
  { value: "plyometric", label: "Pliométrie (anc.)", color: "text-[#FF8C42]", bg: "bg-[#FF8C42]/10 border-[#FF8C42]/30" },
  { value: "mobility", label: "Mobilité (anc.)", color: "text-[#FFB800]", bg: "bg-[#FFB800]/10 border-[#FFB800]/30" },
];

const MUSCLE_GROUPS = [
  "Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Quadriceps", "Ischio-jambiers",
  "Fessiers", "Mollets", "Abdominaux", "Trapèzes", "Avant-bras", "Corps entier"
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

interface AthleteOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

async function fetchAthletes(): Promise<AthleteOption[]> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch("/api/coach/clients", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error();
  const data = await res.json();
  return data.map((c: { id: string; firstName: string; lastName?: string | null }) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName ?? null,
  }));
}

async function addToCalendar(clientId: string, exerciseId: string, dateStr: string): Promise<void> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`/api/coach/clients/${clientId}/quick-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ exerciseId, dateStr }),
  });
  if (!res.ok) throw new Error("Erreur serveur");
}

export default function LibraryPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<ExerciseItem | null>(null);
  const [form, setForm] = useState<ExerciseFormData>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ExerciseItem | null>(null);
  const [customEquipmentInput, setCustomEquipmentInput] = useState("");
  const customEquipmentRef = useRef<HTMLInputElement>(null);
  const [quickAddExercise, setQuickAddExercise] = useState<ExerciseItem | null>(null);
  const [quickAddAthleteId, setQuickAddAthleteId] = useState("");
  const [quickAddDate, setQuickAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: athletes } = useQuery<AthleteOption[]>({
    queryKey: ["/api/coach/clients-list"],
    queryFn: fetchAthletes,
    staleTime: 60000,
  });

  const quickAddMutation = useMutation({
    mutationFn: ({ clientId, exerciseId, dateStr }: { clientId: string; exerciseId: string; dateStr: string }) =>
      addToCalendar(clientId, exerciseId, dateStr),
    onSuccess: () => {
      toast({ title: t("library.added_to_calendar") });
      setQuickAddExercise(null);
    },
    onError: () => toast({ title: t("library.add_failed"), variant: "destructive" }),
  });

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
      toast({ title: t("library.exercise_created") });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      closeDialog();
    },
    onError: () => toast({ title: t("library.create_error"), variant: "destructive" }),
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
      toast({ title: t("library.exercise_updated") });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      closeDialog();
    },
    onError: () => toast({ title: t("library.update_error"), variant: "destructive" }),
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
        throw new Error(json?.error?.message ?? t("library.delete_error_generic"));
      }
    },
    onSuccess: () => {
      toast({ title: t("library.exercise_deleted") });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast({ title: err.message || t("library.delete_error"), variant: "destructive" }),
  });

  const openCreate = () => {
    setEditExercise(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (ex: ExerciseItem) => {
    setEditExercise(ex);
    const rawEquipment = (ex.equipment as string[]) ?? [];
    setForm({
      name: ex.name,
      category: ex.category ?? "compound",
      muscleGroups: (ex.muscleGroups as string[]) ?? [],
      equipment: rawEquipment.map(equipmentKeyFromLabel),
      description: ex.description ?? "",
      demoUrl: ex.demoUrl ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditExercise(null);
    setForm(emptyForm());
    setCustomEquipmentInput("");
  };

  const addCustomEquipment = () => {
    const val = customEquipmentInput.trim();
    if (!val || form.equipment.includes(val)) return;
    setForm(f => ({ ...f, equipment: [...f.equipment, val] }));
    setCustomEquipmentInput("");
    customEquipmentRef.current?.focus();
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: t("library.name_required"), variant: "destructive" });
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
          <h1 className="text-3xl font-display text-white">{t("library.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {exercises ? t("library.exercises_count", { count: exercises.length }) : "..."} · {t("library.subtitle_create_organize")}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary">
          <Plus className="w-4 h-4 mr-2" />
          {t("library.btn_new_exercise")}
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("library.search_placeholder")}
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
            {t("library.filter_label_all")}
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
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono shrink-0">{t("library.muscle_label")}</span>
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
            {mg === "" ? t("library.filter_label_all") : mg}
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
          <p className="text-sm italic">{t("library.no_exercise_found")}</p>
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
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setQuickAddExercise(ex); setQuickAddAthleteId(""); setQuickAddDate(new Date().toISOString().slice(0, 10)); }}
                        className="p-1 rounded hover:bg-accent/20 transition-colors"
                        title={t("library.title_add_to_athlete_calendar")}
                      >
                        <CalendarPlus className="w-3.5 h-3.5 text-accent" />
                      </button>
                      {ex.createdBy !== null ? (
                        <>
                          <button
                            onClick={() => openEdit(ex)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title={t("library.title_modify")}
                          >
                            <Pencil className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(ex)}
                            className="p-1 rounded hover:bg-destructive/20 transition-colors"
                            title={t("library.title_delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] font-mono text-muted-foreground/50 px-1 self-center">
                          {t("library.label_global")}
                        </span>
                      )}
                    </div>
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
                      {t("library.demo_video")}
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
              {editExercise ? t("library.dialog_edit_title") : t("library.dialog_create_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_name")}</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t("library.name_placeholder")}
                className="bg-background border-border text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_category")}</Label>
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
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_muscles")}</Label>
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
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_equipment")}</Label>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {EQUIPMENT_CATEGORIES.map(cat => (
                  <div key={cat}>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1 font-mono">{cat}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EQUIPMENT_CATALOG.filter(e => e.category === cat).map(({ key, labelFr }) => {
                        const selected = form.equipment.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleMultiSelect(form.equipment, key, v => setForm(f => ({ ...f, equipment: v })))}
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors",
                              selected
                                ? "bg-accent/15 border-accent/40 text-accent"
                                : "text-muted-foreground border-border hover:text-white hover:bg-white/5"
                            )}
                          >
                            {selected && <CheckCircle className="w-3 h-3" />}
                            {labelFr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {form.equipment.filter(e => !EQUIPMENT_CATALOG.some(c => c.key === e)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground self-center">{t("library.custom_label")}</span>
                  {form.equipment.filter(e => !EQUIPMENT_CATALOG.some(c => c.key === e)).map(e => (
                    <span key={e} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-accent/15 border-accent/40 text-accent">
                      {e}
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, equipment: f.equipment.filter(x => x !== e) }))}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <input
                  ref={customEquipmentRef}
                  type="text"
                  value={customEquipmentInput}
                  onChange={e => setCustomEquipmentInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomEquipment())}
                  placeholder={t("library.custom_equipment_placeholder")}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={addCustomEquipment}
                  disabled={!customEquipmentInput.trim()}
                  className="px-3 py-1.5 rounded-md text-xs border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("library.btn_add")}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_description_optional")}</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t("library.description_placeholder")}
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_video_link")}</Label>
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
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editExercise ? t("library.btn_update") : t("library.btn_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-add to athlete calendar */}
      <Dialog open={!!quickAddExercise} onOpenChange={o => !o && setQuickAddExercise(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-white flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-accent" /> {t("library.btn_add_to_calendar")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("library.quick_add_dialog_desc", { name: quickAddExercise?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.quick_add_athlete")}</Label>
              <select
                value={quickAddAthleteId}
                onChange={e => setQuickAddAthleteId(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">{t("library.select_athlete_dots")}</option>
                {(athletes || []).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName ?? ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("library.label_session_date")}</Label>
              <Input
                type="date"
                value={quickAddDate}
                onChange={e => setQuickAddDate(e.target.value)}
                className="bg-background border-border text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddExercise(null)} className="border-border">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!quickAddAthleteId || !quickAddDate || !quickAddExercise) return;
                quickAddMutation.mutate({ clientId: quickAddAthleteId, exerciseId: quickAddExercise.id, dateStr: quickAddDate });
              }}
              disabled={!quickAddAthleteId || !quickAddDate || quickAddMutation.isPending}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {quickAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("library.btn_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">{t("library.delete_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("library.delete_dialog_desc", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
