import { useState, useCallback } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetClientDetail, 
  useOverrideClientSession, 
  useResolveAlert,
  useCoachUnlink,
  useCoachUpdateAthleteProfile,
  useGetPrograms,
  UpcomingSession,
} from "@workspace/api-client-react";
import { ModeBadge, cn } from "@/components/ui/mode-badge";
import { 
  Loader2, ArrowLeft, MessageSquare, AlertTriangle, CheckCircle2, UserMinus,
  Pencil, Calendar, Clock, ChevronDown, ChevronUp, Copy, Check, Dumbbell, ExternalLink,
  TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProgramGrid } from "@/components/program-editor";

interface SessionDetailExercise {
  exerciseId: string;
  exerciseName: string;
  prescribed: { sets: number; reps: string | null; loadKg: number | null; coachCue: string | null } | null;
  actual: { setsCompleted: number | null; repsPerSet: unknown; loadKgUsed: number | null; notes: string | null };
}

interface SessionDetail {
  id: string;
  sessionName: string;
  variantMode: string;
  rpe: number | null;
  completedAt: string | null;
  durationMin: number | null;
  exercises: SessionDetailExercise[];
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  elite: "Élite",
};
const GOAL_LABELS: Record<string, string> = {
  strength: "Force",
  muscle: "Prise de masse",
  fat_loss: "Perte de poids",
  performance: "Performance",
  health: "Santé",
  aesthetic: "Esthétique",
  fitness: "Forme générale",
};
const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hiit: "HIIT",
  mobility: "Mobilité",
  recovery: "Récupération",
  sport: "Sport",
  mixed: "Mixte",
};

function groupByWeek(sessions: UpcomingSession[]) {
  const groups: Record<string, UpcomingSession[]> = {};
  for (const s of sessions) {
    const date = parseISO(s.scheduledDate);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = weekStart.toISOString().split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

type Tab = "apercu" | "programme";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: client, isLoading, refetch } = useGetClientDetail(id, { query: { queryKey: [`/api/coach/clients/${id}`], refetchInterval: 30000 }});
  const { data: allPrograms } = useGetPrograms({ query: { queryKey: ["/api/programs"] } });

  const [activeTab, setActiveTab] = useState<Tab>("apercu");
  const [chartRange, setChartRange] = useState<7 | 30>(7);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [sessionTimelineExpanded, setSessionTimelineExpanded] = useState(true);
  const [expandedSessionLogId, setExpandedSessionLogId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetail | "loading" | "error">>({});

  const fetchSessionDetail = useCallback(async (sessionLogId: string) => {
    if (sessionDetails[sessionLogId]) return;
    setSessionDetails(prev => ({ ...prev, [sessionLogId]: "loading" }));
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`${import.meta.env.BASE_URL}api/coach/clients/${id}/sessions/${sessionLogId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: SessionDetail = await res.json();
      setSessionDetails(prev => ({ ...prev, [sessionLogId]: data }));
    } catch {
      setSessionDetails(prev => ({ ...prev, [sessionLogId]: "error" }));
    }
  }, [id, sessionDetails]);

  const handleToggleSessionExpand = (sessionLogId: string) => {
    if (expandedSessionLogId === sessionLogId) {
      setExpandedSessionLogId(null);
    } else {
      setExpandedSessionLogId(sessionLogId);
      fetchSessionDetail(sessionLogId);
    }
  };

  const overrideMutation = useOverrideClientSession();
  const resolveMutation = useResolveAlert();
  const unlinkMutation = useCoachUnlink();
  const updateProfileMutation = useCoachUpdateAthleteProfile();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    heightCm: "",
    weightKg: "",
    fitnessLevel: "",
    primaryGoal: "",
  });

  if (isLoading || !client) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeProgram = allPrograms?.find(p => p.athleteId === id && p.isActive);

  const handleOverride = async (mode: 'performance' | 'normal' | 'adapt' | 'recovery') => {
    try {
      await overrideMutation.mutateAsync({ clientId: id, data: { mode } });
      toast({ title: "Séance modifiée", description: `Définie sur ${mode.toUpperCase()}` });
      refetch();
    } catch {
      toast({ title: "Échec de la modification", variant: "destructive" });
    }
  };

  const handleUnlink = async () => {
    try {
      await unlinkMutation.mutateAsync({ data: { athleteId: id } });
      toast({ title: "Athlète délié", description: `${client?.firstName} a été retiré de votre équipe.` });
      navigate("/clients");
    } catch {
      toast({ title: "Échec de la déconnexion", variant: "destructive" });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveMutation.mutateAsync({ alertId, data: { resolutionNote: "Résolu via dashboard" } });
      toast({ title: "Alerte résolue" });
      refetch();
    } catch {
      toast({ title: "Échec de la résolution", variant: "destructive" });
    }
  };

  const openProfileDialog = () => {
    setProfileForm({
      heightCm: client.heightCm ? String(client.heightCm) : "",
      weightKg: client.weightKg ? String(parseFloat(String(client.weightKg)).toFixed(1)) : "",
      fitnessLevel: client.fitnessLevel ?? "",
      primaryGoal: client.primaryGoal ?? "",
    });
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    const data: Record<string, number | string> = {};
    const h = parseInt(profileForm.heightCm, 10);
    if (!isNaN(h) && h >= 50 && h <= 300) data.heightCm = h;
    const w = parseFloat(profileForm.weightKg);
    if (!isNaN(w) && w >= 20 && w <= 500) data.weightKg = w;
    if (profileForm.fitnessLevel) data.fitnessLevel = profileForm.fitnessLevel;
    if (profileForm.primaryGoal) data.primaryGoal = profileForm.primaryGoal;

    try {
      await updateProfileMutation.mutateAsync({ clientId: id, data });
      toast({ title: "Profil mis à jour" });
      setProfileDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/coach/clients/${id}`] });
    } catch {
      toast({ title: "Échec de la mise à jour", variant: "destructive" });
    }
  };

  const handleCopyCode = () => {
    if (client.inviteCode) {
      navigator.clipboard.writeText(client.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const chartData = client.recentCheckins
    .slice(0, chartRange)
    .reverse()
    .map(c => ({
      date: format(new Date(c.date), 'd MMM', { locale: fr }),
      score: c.adaptScore
    }));

  const metrics = [
    { name: "Sommeil", value: client.todayCheckin?.sleep },
    { name: "Énergie", value: client.todayCheckin?.energy },
    { name: "Stress", value: client.todayCheckin?.stress },
    { name: "Courbatures", value: client.todayCheckin?.soreness },
    { name: "Motivation", value: client.todayCheckin?.motivation },
  ];

  const allSessionsTimeline: UpcomingSession[] = [...(client.upcomingSessions ?? [])].sort(
    (a, b) => a.scheduledDate.localeCompare(b.scheduledDate)
  );

  const weekGroups = groupByWeek(allSessionsTimeline);
  const today = new Date().toISOString().split("T")[0];

  const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: "apercu", label: "Aperçu", icon: CheckCircle2 },
    { id: "programme", label: "Programme", icon: Dumbbell },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux athlètes
        </Link>
      </div>

      {/* Athlete header card */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-card border border-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary" />
        
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center text-3xl font-display text-white shadow-inner">
            {client.firstName[0]}{client.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-4xl font-display text-white tracking-wide">{client.firstName} {client.lastName}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="font-mono">{client.email}</span>
              {client.fitnessLevel && <span>• Niveau : <span className="text-white capitalize">{LEVEL_LABELS[client.fitnessLevel] ?? client.fitnessLevel}</span></span>}
              {client.primaryGoal && <span>• Objectif : <span className="text-white capitalize">{GOAL_LABELS[client.primaryGoal] ?? client.primaryGoal}</span></span>}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {client.heightCm && (
                <span className="text-muted-foreground">Taille : <span className="text-white font-medium">{client.heightCm} cm</span></span>
              )}
              {client.weightKg && (
                <span className="text-muted-foreground">Poids : <span className="text-white font-medium">{parseFloat(String(client.weightKg)).toFixed(1)} kg</span></span>
              )}
              {client.inviteCode && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group"
                  title="Copier le code d'invitation"
                >
                  Code : <span className="font-mono text-primary font-semibold tracking-widest">{client.inviteCode}</span>
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          <Button variant="outline" onClick={openProfileDialog} className="w-full justify-start hover-elevate border-border">
            <Pencil className="w-4 h-4 mr-2" /> Modifier le profil
          </Button>
          <Link href={`/messages/${client.id}`}>
            <Button variant="outline" className="w-full justify-start hover-elevate">
              <MessageSquare className="w-4 h-4 mr-2" /> Envoyer un message
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-start bg-white/5 hover:bg-white/10 text-white border border-white/10 hover-elevate" disabled={overrideMutation.isPending}>
                Forcer la séance du jour
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => handleOverride('performance')} className="text-[#00F5A0] focus:bg-[#00F5A0]/10">Forcer PERFORMANCE</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('normal')} className="text-[#00D9FF] focus:bg-[#00D9FF]/10">Forcer NORMAL</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('adapt')} className="text-[#FFB800] focus:bg-[#FFB800]/10">Forcer ADAPT</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('recovery')} className="text-[#7B61FF] focus:bg-[#7B61FF]/10">Forcer RÉCUPÉRATION</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => setUnlinkDialogOpen(true)}
            className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <UserMinus className="w-4 h-4 mr-2" /> Délier l'athlète
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile edit dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-display text-xl">MODIFIER LE PROFIL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Taille (cm)</Label>
                <Input
                  type="number"
                  value={profileForm.heightCm}
                  onChange={e => setProfileForm(p => ({ ...p, heightCm: e.target.value }))}
                  placeholder="175"
                  min={50}
                  max={300}
                  className="bg-background border-border text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Poids (kg)</Label>
                <Input
                  type="number"
                  value={profileForm.weightKg}
                  onChange={e => setProfileForm(p => ({ ...p, weightKg: e.target.value }))}
                  placeholder="70"
                  min={20}
                  max={500}
                  step={0.1}
                  className="bg-background border-border text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Niveau de forme</Label>
              <select
                value={profileForm.fitnessLevel}
                onChange={e => setProfileForm(p => ({ ...p, fitnessLevel: e.target.value }))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">-- Sélectionner --</option>
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Objectif principal</Label>
              <select
                value={profileForm.primaryGoal}
                onChange={e => setProfileForm(p => ({ ...p, primaryGoal: e.target.value }))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">-- Sélectionner --</option>
                <option value="strength">Force</option>
                <option value="muscle">Prise de masse</option>
                <option value="fat_loss">Perte de poids</option>
                <option value="performance">Performance</option>
                <option value="health">Santé</option>
                <option value="aesthetic">Esthétique</option>
                <option value="fitness">Forme générale</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)} className="border-border">
              Annuler
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">Délier {client.firstName} ?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Cette action retirera {client.firstName} {client.lastName} de votre roster. L'athlète conservera son compte et son historique de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Oui, délier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* APERÇU TAB */}
      {activeTab === "apercu" && (
        <>
          {client.activeAlerts.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-bold uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5" /> Alertes actives
              </div>
              <div className="grid gap-2">
                {client.activeAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-destructive/20">
                    <div>
                      <span className="text-xs font-mono text-destructive uppercase mr-2">[{alert.priority}]</span>
                      <span className="text-sm text-white">{alert.message}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white" onClick={() => handleResolveAlert(alert.id)}>
                      Résoudre <CheckCircle2 className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card border-border shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xl font-display tracking-widest text-white">ÉVOLUTION ADAPT SCORE</CardTitle>
                  <div className="flex items-center gap-1 bg-background p-1 rounded-md border border-border">
                    <button 
                      onClick={() => setChartRange(7)} 
                      className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", chartRange === 7 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}
                    >
                      7J
                    </button>
                    <button 
                      onClick={() => setChartRange(30)} 
                      className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", chartRange === 30 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}
                    >
                      30J
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="h-[250px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} axisLine={false} tickLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                          />
                          <ReferenceLine y={60} stroke="hsl(var(--primary))" strokeDasharray="3 3" opacity={0.3} />
                          <ReferenceLine y={40} stroke="hsl(var(--accent))" strokeDasharray="3 3" opacity={0.3} />
                          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">Pas encore assez de données</div>
                  )}
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-display text-muted-foreground tracking-widest mb-3 uppercase">Forme du jour</h3>
                {client.todayCheckin ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {metrics.map(m => {
                      const val = m.value || 0;
                      const color = val >= 4 ? 'bg-primary' : val >= 3 ? 'bg-accent' : 'bg-destructive';
                      return (
                        <div key={m.name} className="bg-background border border-border p-3 rounded-xl flex flex-col items-center justify-center text-center hover-elevate">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{m.name}</span>
                          <span className="text-2xl font-display text-white">{val}<span className="text-xs text-muted-foreground">/5</span></span>
                          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div className={cn("h-full rounded-full", color)} style={{ width: `${(val / 5) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-background border border-border p-6 rounded-xl text-center text-muted-foreground italic text-sm">
                    Aucun check-in soumis aujourd'hui.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Session timeline */}
              <Card className="bg-card border-border shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      PLANNING
                    </CardTitle>
                    <button
                      onClick={() => setSessionTimelineExpanded(e => !e)}
                      className="text-muted-foreground hover:text-white transition-colors"
                    >
                      {sessionTimelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </CardHeader>
                {sessionTimelineExpanded && (
                  <CardContent className="pt-0">
                    {weekGroups.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm italic">
                        Aucun programme actif planifié.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {weekGroups.map(([weekStart, sessions]) => {
                          const weekStartDate = parseISO(weekStart);
                          const weekEnd = addDays(weekStartDate, 6);
                          const isCurrentWeek = new Date() >= weekStartDate && new Date() <= weekEnd;

                          return (
                            <div key={weekStart}>
                              <div className={cn(
                                "text-xs font-mono uppercase tracking-wider mb-2 pb-1 border-b",
                                isCurrentWeek ? "text-primary border-primary/30" : "text-muted-foreground border-border"
                              )}>
                                {isCurrentWeek ? "↗ Cette semaine — " : ""}
                                {format(weekStartDate, 'd MMM', { locale: fr })} – {format(weekEnd, 'd MMM yyyy', { locale: fr })}
                              </div>
                              <div className="space-y-2">
                                {sessions.map((session) => {
                                  const sessionDate = parseISO(session.scheduledDate);
                                  const isSessionToday = session.scheduledDate === today;
                                  const isPastSession = session.scheduledDate < today;

                                  return (
                                    <div
                                      key={session.sessionId}
                                      className={cn(
                                        "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                                        session.isCompleted
                                          ? "bg-primary/5 border-primary/20 opacity-70"
                                          : isSessionToday
                                          ? "bg-primary/10 border-primary/40"
                                          : isPastSession && !session.isCompleted
                                          ? "bg-destructive/5 border-destructive/20"
                                          : "bg-background border-border hover:border-white/20"
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full shrink-0",
                                          session.isCompleted ? "bg-primary" :
                                          isSessionToday ? "bg-primary animate-pulse" :
                                          isPastSession ? "bg-destructive" :
                                          "bg-muted-foreground/40"
                                        )} />
                                        <div className="min-w-0">
                                          <div className="text-xs font-medium text-white truncate">{session.sessionName}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {format(sessionDate, 'EEE d MMM', { locale: fr })}
                                            {session.estimatedDurationMin && (
                                              <span className="ml-1.5 inline-flex items-center gap-0.5">
                                                <Clock className="w-3 h-3" />{session.estimatedDurationMin}min
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <span className={cn(
                                          "text-xs px-1.5 py-0.5 rounded font-mono",
                                          session.isCompleted ? "bg-primary/20 text-primary" :
                                          isPastSession ? "bg-destructive/20 text-destructive" :
                                          isSessionToday ? "bg-primary/30 text-primary font-semibold" :
                                          "bg-white/5 text-muted-foreground"
                                        )}>
                                          {session.isCompleted ? "✓ Fait" :
                                           isPastSession ? "Manqué" :
                                           isSessionToday ? "Auj." : 
                                           SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {client.recentSessions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                          Séances récentes — Charges réelles vs prescrites
                        </div>
                        <div className="space-y-2">
                          {client.recentSessions.slice(0, 5).map(session => {
                            const isExpanded = expandedSessionLogId === session.id;
                            const detail = sessionDetails[session.id];
                            return (
                              <div key={session.id} className="rounded-lg bg-background border border-border overflow-hidden">
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors text-left"
                                  onClick={() => handleToggleSessionExpand(session.id)}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div>
                                      <div className="text-xs font-medium text-white">
                                        {session.completedAt ? format(new Date(session.completedAt), 'd MMM yyyy', { locale: fr }) : 'Incomplète'}
                                      </div>
                                      <div className="mt-0.5">
                                        <ModeBadge mode={session.variantMode} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                      <div className="text-[10px] text-muted-foreground uppercase">RPE</div>
                                      <div className="text-sm font-mono text-white">{session.rpe || '--'}<span className="text-xs text-muted-foreground">/10</span></div>
                                    </div>
                                    {isExpanded
                                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="border-t border-border px-3 pb-3">
                                    {detail === "loading" && (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                      </div>
                                    )}
                                    {detail === "error" && (
                                      <p className="text-xs text-destructive py-3">Impossible de charger les détails.</p>
                                    )}
                                    {detail && detail !== "loading" && detail !== "error" && (
                                      <div className="pt-3 space-y-3">
                                        {detail.durationMin && (
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            Durée réelle : <span className="text-white font-medium">{detail.durationMin} min</span>
                                          </div>
                                        )}
                                        {detail.exercises.length === 0 ? (
                                          <p className="text-xs text-muted-foreground italic">Aucun exercice enregistré.</p>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="text-muted-foreground font-mono uppercase text-[10px]">
                                                  <th className="text-left pb-2 pr-3">Exercice</th>
                                                  <th className="text-center pb-2 pr-2">Prescrit</th>
                                                  <th className="text-center pb-2 pr-2">Réel</th>
                                                  <th className="text-center pb-2">Écart</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-border/30">
                                                {detail.exercises.map(ex => {
                                                  const presLoad = ex.prescribed?.loadKg ?? null;
                                                  const realLoad = ex.actual.loadKgUsed ?? null;
                                                  const diff = presLoad !== null && realLoad !== null ? realLoad - presLoad : null;
                                                  return (
                                                    <tr key={ex.exerciseId} className="hover:bg-white/[0.02]">
                                                      <td className="py-2 pr-3 text-white font-medium truncate max-w-[120px]">{ex.exerciseName}</td>
                                                      <td className="py-2 pr-2 text-center text-muted-foreground">
                                                        {ex.prescribed
                                                          ? <span>{ex.prescribed.sets}×{ex.prescribed.reps ?? '?'}{ex.prescribed.loadKg ? ` @${ex.prescribed.loadKg}kg` : ''}</span>
                                                          : <span className="italic">—</span>}
                                                      </td>
                                                      <td className="py-2 pr-2 text-center">
                                                        <span className="text-white">
                                                          {ex.actual.setsCompleted ?? '?'}×
                                                          {Array.isArray(ex.actual.repsPerSet)
                                                            ? (ex.actual.repsPerSet as number[]).join(',')
                                                            : '?'}
                                                          {realLoad ? ` @${realLoad}kg` : ''}
                                                        </span>
                                                      </td>
                                                      <td className="py-2 text-center">
                                                        {diff === null ? (
                                                          <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                                                        ) : diff > 0 ? (
                                                          <span className="flex items-center justify-center gap-0.5 text-primary font-semibold">
                                                            <TrendingUp className="w-3 h-3" />+{diff.toFixed(1)}
                                                          </span>
                                                        ) : diff < 0 ? (
                                                          <span className="flex items-center justify-center gap-0.5 text-destructive">
                                                            <TrendingDown className="w-3 h-3" />{diff.toFixed(1)}
                                                          </span>
                                                        ) : (
                                                          <span className="text-muted-foreground">0</span>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* PROGRAMME TAB */}
      {activeTab === "programme" && (
        <div className="space-y-4">
          {activeProgram ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display text-white">{activeProgram.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeProgram.durationWeeks} semaine{activeProgram.durationWeeks !== 1 ? "s" : ""}
                    {activeProgram.startDate && ` · Démarré le ${format(new Date(activeProgram.startDate), 'd MMMM yyyy', { locale: fr })}`}
                  </p>
                </div>
                <Link href={`/programs/${activeProgram.id}`}>
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-white gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Vue complète
                  </Button>
                </Link>
              </div>
              <ProgramGrid programId={activeProgram.id} />
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-white font-medium mb-1">Aucun programme actif</p>
              <p className="text-muted-foreground text-sm mb-6">Créez un programme depuis la page Programmes pour le retrouver ici.</p>
              <Link href="/programs">
                <Button className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">
                  Voir les programmes
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
