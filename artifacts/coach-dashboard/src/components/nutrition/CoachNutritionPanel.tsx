import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Apple, FileText, Upload, Trash2, Loader2, Settings2, ChevronDown, ChevronUp 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NutritionGoals {
  proteinG: number;
  carbsG: number;
  fatG: number;
  kcal: number;
}

interface MealLog {
  id: string;
  date: string;
  mealType: string;
  description: string | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
  kcal: number;
}

interface NutritionPdf {
  id: string;
  title: string;
  uploadedAt: string;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

function MacroProgress({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }} className="font-mono">{value}g / {goal}g</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

interface Props {
  athleteId: string;
}

export function CoachNutritionPanel({ athleteId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [goalsOpen, setGoalsOpen] = useState(false);
  const [mealsExpanded, setMealsExpanded] = useState(true);
  const [deletePdfId, setDeletePdfId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [goalForm, setGoalForm] = useState<NutritionGoals>({ proteinG: 150, carbsG: 250, fatG: 70, kcal: 2200 });

  const goalsQuery = useQuery<NutritionGoals>({
    queryKey: [`/api/coach/clients/${athleteId}/nutrition/goals`],
    queryFn: () => fetch(`/api/coach/clients/${athleteId}/nutrition/goals`).then(r => r.json()),
  });

  const mealsQuery = useQuery<MealLog[]>({
    queryKey: [`/api/coach/clients/${athleteId}/nutrition/meals`],
    queryFn: () => fetch(`/api/coach/clients/${athleteId}/nutrition/meals`).then(r => r.json()),
  });

  const pdfsQuery = useQuery<NutritionPdf[]>({
    queryKey: [`/api/coach/clients/${athleteId}/nutrition/pdfs`],
    queryFn: () => fetch(`/api/coach/clients/${athleteId}/nutrition/pdfs`).then(r => r.json()),
  });

  const setGoalsMutation = useMutation({
    mutationFn: (data: NutritionGoals) =>
      fetch(`/api/coach/clients/${athleteId}/nutrition/goals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/coach/clients/${athleteId}/nutrition/goals`] });
      setGoalsOpen(false);
      toast({ title: "Objectifs mis à jour" });
    },
  });

  const deletePdfMutation = useMutation({
    mutationFn: (pdfId: string) =>
      fetch(`/api/coach/clients/${athleteId}/nutrition/pdfs/${pdfId}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/coach/clients/${athleteId}/nutrition/pdfs`] });
      setDeletePdfId(null);
      toast({ title: "Plan supprimé" });
    },
  });

  function openGoals() {
    const g = goalsQuery.data ?? { proteinG: 150, carbsG: 250, fatG: 70, kcal: 2200 };
    setGoalForm(g);
    setGoalsOpen(true);
  }

  async function handleUpload() {
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      const urlRes = await fetch(`/api/coach/clients/${athleteId}/nutrition/pdfs/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: uploadTitle.trim(), contentType: "application/pdf" }),
      });
      if (!urlRes.ok) throw new Error("Erreur lors de la génération du lien d'upload");
      const { uploadUrl, objectPath, metadataEndpoint } = await urlRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: uploadFile,
      });

      await fetch(metadataEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: uploadTitle.trim(), objectPath }),
      });

      queryClient.invalidateQueries({ queryKey: [`/api/coach/clients/${athleteId}/nutrition/pdfs`] });
      setUploadOpen(false);
      setUploadTitle("");
      setUploadFile(null);
      toast({ title: "Plan nutritionnel envoyé" });
    } catch {
      toast({ title: "Erreur d'upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const goals = goalsQuery.data;
  const meals = mealsQuery.data ?? [];
  const pdfs = pdfsQuery.data ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter(m => m.date === today);
  const todayKcal = todayMeals.reduce((a, m) => a + m.kcal, 0);
  const todayProtein = todayMeals.reduce((a, m) => a + m.proteinG, 0);
  const todayCarbs = todayMeals.reduce((a, m) => a + m.carbsG, 0);
  const todayFat = todayMeals.reduce((a, m) => a + m.fatG, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="w-4 h-4 text-green-400" />
          <h2 className="text-lg font-display text-white">Nutrition</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-white gap-1.5"
            onClick={openGoals}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Objectifs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-green-500/30 text-green-400 hover:bg-green-500/10 gap-1.5"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Envoyer un plan
          </Button>
        </div>
      </div>

      {goals && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground tracking-wider">
              SUIVI DU JOUR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-green-400">{todayKcal}</span>
              <span className="text-muted-foreground text-sm">/ {goals.kcal} kcal</span>
            </div>
            <MacroProgress label="Protéines" value={todayProtein} goal={goals.proteinG} color="#00F0FF" />
            <MacroProgress label="Glucides" value={todayCarbs} goal={goals.carbsG} color="#F59E0B" />
            <MacroProgress label="Lipides" value={todayFat} goal={goals.fatG} color="#A855F7" />
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setMealsExpanded(v => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono text-muted-foreground tracking-wider">
              REPAS RÉCENTS
            </CardTitle>
            {mealsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
        {mealsExpanded && (
          <CardContent className="space-y-2 pt-0">
            {mealsQuery.isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {meals.length === 0 && !mealsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Aucun repas enregistré.</p>
            )}
            {meals.slice(0, 10).map(meal => (
              <div key={meal.id} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {format(new Date(meal.date + "T12:00:00"), "d MMM", { locale: fr })}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType}
                    </span>
                  </div>
                  {meal.description && (
                    <p className="text-sm text-white truncate">{meal.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {meal.kcal > 0 && <p className="text-sm font-mono text-green-400">{meal.kcal} kcal</p>}
                  <p className="text-xs text-muted-foreground font-mono">
                    {meal.proteinG}P · {meal.carbsG}G · {meal.fatG}L
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {pdfs.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground tracking-wider">
              PLANS NUTRITIONNELS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{pdf.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {format(new Date(pdf.uploadedAt), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-400"
                    onClick={() => setDeletePdfId(pdf.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-display">Objectifs nutritionnels</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(["proteinG", "carbsG", "fatG", "kcal"] as (keyof NutritionGoals)[]).map(key => (
              <div key={key} className="space-y-1">
                <Label className="text-muted-foreground text-sm">
                  {{ proteinG: "Protéines (g)", carbsG: "Glucides (g)", fatG: "Lipides (g)", kcal: "Calories (kcal)" }[key]}
                </Label>
                <Input
                  type="number"
                  value={goalForm[key]}
                  onChange={e => setGoalForm(f => ({ ...f, [key]: parseInt(e.target.value, 10) || 0 }))}
                  className="bg-background border-border text-white"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalsOpen(false)} className="border-border">Annuler</Button>
            <Button
              onClick={() => setGoalsMutation.mutate(goalForm)}
              disabled={setGoalsMutation.isPending}
              className="bg-green-500 text-black hover:bg-green-400"
            >
              {setGoalsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={open => { setUploadOpen(open); if (!open) { setUploadTitle(""); setUploadFile(null); } }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-display">Envoyer un plan nutritionnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Titre du plan</Label>
              <Input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="Ex : Plan masse, Phase sèche…"
                className="bg-background border-border text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Fichier PDF</Label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:text-white gap-2 justify-start"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {uploadFile ? uploadFile.name : "Choisir un fichier…"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="border-border">Annuler</Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadTitle.trim() || !uploadFile}
              className="bg-primary text-black hover:bg-primary/90"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePdfId} onOpenChange={o => !o && setDeletePdfId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">Supprimer ce plan ?</AlertDialogTitle>
            <AlertDialogDescription>Ce plan nutritionnel sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deletePdfId && deletePdfMutation.mutate(deletePdfId)}
              disabled={deletePdfMutation.isPending}
            >
              {deletePdfMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
