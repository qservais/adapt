import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Pencil, Calendar, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Check,
  Dumbbell, ExternalLink, TrendingUp, TrendingDown, Minus, Plus, Trash2, Apple
} from "lucide-react";
import { CoachNutritionPanel } from "@/components/nutrition/CoachNutritionPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine, Cell
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
import { ProgramGrid, SessionModal } from "@/components/program-editor";

interface PerformanceTest {
  id: string;
  athleteId: string;
  coachId: string | null;
  testType: string;
  exerciseId: string | null;
  exerciseName: string | null;
  value: number;
  unit: string;
  testedAt: string;
  notes: string | null;
  createdAt: string;
}

const PREDEFINED_TEST_TYPES = [
  { value: "1rm_squat", label: "1RM Squat", unit: "kg" },
  { value: "1rm_bench", label: "1RM Développé couché", unit: "kg" },
  { value: "1rm_deadlift", label: "1RM Soulevé de terre", unit: "kg" },
  { value: "1rm_clean", label: "1RM Épaulé-jeté", unit: "kg" },
  { value: "1rm_press", label: "1RM Développé militaire", unit: "kg" },
  { value: "max_pullups", label: "Max Tractions", unit: "reps" },
  { value: "max_pushups", label: "Max Pompes", unit: "reps" },
  { value: "cooper", label: "Test de Cooper (12 min)", unit: "m" },
  { value: "sprint_30m", label: "Sprint 30m", unit: "s" },
  { value: "sprint_100m", label: "Sprint 100m", unit: "s" },
  { value: "vo2max", label: "VO2max estimé", unit: "ml/kg/min" },
  { value: "jump_vertical", label: "Saut vertical", unit: "cm" },
  { value: "custom", label: "Personnalisé", unit: "" },
];

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
  athleteNotes: string | null;
  completedAt: string | null;
  durationMin: number | null;
  exercises: SessionDetailExercise[];
}

interface TrainingContext {
  availableDays: string[];
  trainingLocations: string[];
  equipment: string[];
  sessionDurationMin: number | null;
  sessionDurationMax: number | null;
  injuries: string | null;
  units: string;
}

interface ExtendedClientDetail {
  secondaryGoal: string | null;
  trainingContext: TrainingContext | null;
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

type Tab = "apercu" | "programme" | "tests" | "nutrition";

export default function ClientDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: client, isLoading, refetch } = useGetClientDetail(id, { query: { queryKey: [`/api/coach/clients/${id}`], refetchInterval: 30000 }});
  const extClient = client as (typeof client & ExtendedClientDetail) | undefined;
  const { data: allPrograms } = useGetPrograms({ query: { queryKey: ["/api/programs"] } });

  const [activeTab, setActiveTab] = useState<Tab>("apercu");
  const [chartRange, setChartRange] = useState<7 | 30>(7);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [sessionTimelineExpanded, setSessionTimelineExpanded] = useState(true);
  const [expandedSessionLogId, setExpandedSessionLogId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetail | "loading" | "error">>({});
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [addSessionSlot, setAddSessionSlot] = useState<{ weekNumber: number; dayNumber: number } | null>(null);
  const [selectedCalSession, setSelectedCalSession] = useState<UpcomingSession | null>(null);
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [addDateValue, setAddDateValue] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateProgramId, setActivateProgramId] = useState<string | null>(null);
  const [activateStartDate, setActivateStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [activating, setActivating] = useState(false);

  // Tests state
  const [tests, setTests] = useState<PerformanceTest[] | null>(null);
  const [testsLoading, setTestsLoading] = useState(false);
  const [addTestOpen, setAddTestOpen] = useState(false);
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<string | null>(null);
  const [testForm, setTestForm] = useState({
    testType: "1rm_squat",
    customType: "",
    exerciseName: "",
    value: "",
    unit: "kg",
    testedAt: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [testSaving, setTestSaving] = useState(false);
  const [testDeleting, setTestDeleting] = useState(false);

  const fetchSessionDetail = useCallback(async (sessionLogId: string) => {
    if (sessionDetails[sessionLogId]) return;
    setSessionDetails(prev => ({ ...prev, [sessionLogId]: "loading" }));
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/coach/clients/${id}/sessions/${sessionLogId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: SessionDetail = await res.json();
      setSessionDetails(prev => ({ ...prev, [sessionLogId]: data }));
    } catch {
      setSessionDetails(prev => ({ ...prev, [sessionLogId]: "error" }));
    }
  }, [id, sessionDetails]);

  const fetchTests = useCallback(async () => {
    setTestsLoading(true);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/coach/clients/${id}/tests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: PerformanceTest[] = await res.json();
      setTests(data);
      if (data.length > 0 && !selectedTestType) {
        setSelectedTestType(data[0].testType);
      }
    } catch {
      setTests([]);
    } finally {
      setTestsLoading(false);
    }
  }, [id, selectedTestType]);

  useEffect(() => {
    if (activeTab === "tests" && tests === null) {
      fetchTests();
    }
  }, [activeTab, tests, fetchTests]);

  const handleAddTest = async () => {
    const effectiveType = testForm.testType === "custom" ? testForm.customType.trim() : testForm.testType;
    if (!effectiveType || !testForm.value || !testForm.unit) return;
    // For predefined types, use the label as exerciseName; for custom, use the user-provided name
    const predefined = PREDEFINED_TEST_TYPES.find(p => p.value === testForm.testType);
    const effectiveExerciseName = testForm.testType === "custom"
      ? (testForm.exerciseName.trim() || testForm.customType.trim() || undefined)
      : (predefined?.label || undefined);
    setTestSaving(true);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/coach/clients/${id}/tests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          testType: effectiveType,
          exerciseName: effectiveExerciseName,
          value: parseFloat(testForm.value),
          unit: testForm.unit,
          testedAt: testForm.testedAt,
          notes: testForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t("clients.detail.toast_test_added") });
      setAddTestOpen(false);
      setSelectedTestType(effectiveType);
      await fetchTests();
    } catch {
      toast({ title: t("clients.detail.toast_test_add_error"), variant: "destructive" });
    } finally {
      setTestSaving(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    setTestDeleting(true);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/coach/clients/${id}/tests/${testId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: t("clients.detail.toast_test_deleted") });
      setDeleteTestId(null);
      await fetchTests();
    } catch {
      toast({ title: t("clients.detail.toast_test_delete_error"), variant: "destructive" });
    } finally {
      setTestDeleting(false);
    }
  };

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
  const inactivePrograms = allPrograms?.filter(p => p.athleteId === id && !p.isActive) ?? [];

  const openActivateDialog = (programId: string) => {
    setActivateProgramId(programId);
    setActivateStartDate(new Date().toISOString().split("T")[0]);
    setActivateDialogOpen(true);
  };

  const handleActivateProgram = async () => {
    if (!activateProgramId) return;
    setActivating(true);
    try {
      const token = localStorage.getItem("adapt_coach_access");
      const res = await fetch(`/api/programs/${activateProgramId}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: activateStartDate }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t("clients.detail.toast_program_activated") });
      setActivateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      refetch();
    } catch {
      toast({ title: t("clients.detail.toast_program_activate_error"), variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  const handleOverride = async (mode: 'performance' | 'normal' | 'adapt' | 'recovery') => {
    try {
      await overrideMutation.mutateAsync({ clientId: id, data: { mode } });
      toast({ title: t("clients.detail.toast_session_modified"), description: t("clients.detail.toast_session_set_to", { mode: mode.toUpperCase() }) });
      refetch();
    } catch {
      toast({ title: t("clients.detail.toast_modify_failed"), variant: "destructive" });
    }
  };

  const handleUnlink = async () => {
    try {
      await unlinkMutation.mutateAsync({ data: { athleteId: id } });
      toast({ title: t("clients.detail.toast_unlinked"), description: t("clients.detail.toast_unlink_desc", { name: client?.firstName ?? "" }) });
      navigate("/clients");
    } catch {
      toast({ title: t("clients.detail.toast_unlink_failed"), variant: "destructive" });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveMutation.mutateAsync({ alertId, data: { resolutionNote: t("clients.detail.alert_resolved_via_dashboard") } });
      toast({ title: t("clients.detail.toast_alert_resolved") });
      refetch();
    } catch {
      toast({ title: t("clients.detail.toast_alert_resolution_failed"), variant: "destructive" });
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
      toast({ title: t("clients.detail.toast_profile_updated") });
      setProfileDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/coach/clients/${id}`] });
    } catch {
      toast({ title: t("clients.detail.toast_profile_update_failed"), variant: "destructive" });
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
    { name: t("clients.detail.metric_sleep"), value: client.todayCheckin?.sleep },
    { name: t("clients.detail.metric_energy"), value: client.todayCheckin?.energy },
    { name: t("clients.detail.metric_stress"), value: client.todayCheckin?.stress },
    { name: t("clients.detail.metric_soreness"), value: client.todayCheckin?.soreness },
    { name: t("clients.detail.metric_motivation"), value: client.todayCheckin?.motivation },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: "apercu", label: t("clients.detail.tab_overview"), icon: CheckCircle2 },
    { id: "programme", label: t("clients.detail.tab_program"), icon: Dumbbell },
    { id: "tests", label: t("clients.detail.tab_tests"), icon: TrendingUp },
    { id: "nutrition", label: t("clients.detail.tab_nutrition"), icon: Apple },
  ];

  const levelLabel = (lvl: string) => t(`clients.detail.level_${lvl}`, { defaultValue: lvl });
  const goalLabel = (g: string) => t(`clients.detail.goal_${g}`, { defaultValue: g });
  const sessionTypeLabel = (s: string) => t(`clients.detail.session_type_${s}`, { defaultValue: s });
  const testTypeLabel = (value: string) => {
    const p = PREDEFINED_TEST_TYPES.find(pt => pt.value === value);
    return t(`clients.detail.test_type_${value}`, { defaultValue: p?.label ?? value.replace(/_/g, " ") });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("clients.detail.back_to_athletes")}
        </Link>
      </div>

      {/* Athlete header card */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-card border border-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary" />
        
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center text-3xl font-display text-white shadow-inner overflow-hidden">
            {client.avatarUrl ? (
              <img src={client.avatarUrl} alt={client.firstName} className="w-full h-full object-cover" />
            ) : (
              <>{client.firstName[0]}{client.lastName?.[0]}</>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-display text-white tracking-wide">{client.firstName} {client.lastName}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="font-mono">{client.email}</span>
              {client.fitnessLevel && <span>• {t("clients.detail.level_label")} : <span className="text-white capitalize">{levelLabel(client.fitnessLevel)}</span></span>}
              {client.primaryGoal && <span>• {t("clients.detail.goal_label")} : <span className="text-white capitalize">{goalLabel(client.primaryGoal)}</span></span>}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {client.heightCm && (
                <span className="text-muted-foreground">{t("clients.detail.height_label")} : <span className="text-white font-medium">{client.heightCm} cm</span></span>
              )}
              {client.weightKg && (
                <span className="text-muted-foreground">{t("clients.detail.weight_label")} : <span className="text-white font-medium">{parseFloat(String(client.weightKg)).toFixed(1)} kg</span></span>
              )}
              {client.inviteCode && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group"
                  title={t("clients.detail.copy_invite_title")}
                >
                  {t("clients.detail.code_label")} : <span className="font-mono text-primary font-semibold tracking-widest">{client.inviteCode}</span>
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          <Button variant="outline" onClick={openProfileDialog} className="w-full justify-start hover-elevate border-border">
            <Pencil className="w-4 h-4 mr-2" /> {t("clients.detail.btn_edit_profile")}
          </Button>
          <Link href={`/messages/${client.id}`}>
            <Button variant="outline" className="w-full justify-start hover-elevate">
              <MessageSquare className="w-4 h-4 mr-2" /> {t("clients.detail.btn_send_message")}
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-start bg-white/5 hover:bg-white/10 text-white border border-white/10 hover-elevate" disabled={overrideMutation.isPending}>
                {t("clients.detail.btn_force_today")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => handleOverride('performance')} className="text-[#00F5A0] focus:bg-[#00F5A0]/10">{t("clients.detail.force_performance")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('normal')} className="text-[#00D9FF] focus:bg-[#00D9FF]/10">{t("clients.detail.force_normal")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('adapt')} className="text-[#FFB800] focus:bg-[#FFB800]/10">{t("clients.detail.force_adapt")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('recovery')} className="text-[#7B61FF] focus:bg-[#7B61FF]/10">{t("clients.detail.force_recovery")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => setUnlinkDialogOpen(true)}
            className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <UserMinus className="w-4 h-4 mr-2" /> {t("clients.detail.btn_unlink")}
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit overflow-x-auto max-w-full">
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
            <DialogTitle className="text-white font-display text-xl">{t("clients.detail.dialog_edit_profile")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("clients.detail.label_height_cm")}</Label>
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
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("clients.detail.label_weight_kg")}</Label>
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
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("clients.detail.label_fitness_level")}</Label>
              <select
                value={profileForm.fitnessLevel}
                onChange={e => setProfileForm(p => ({ ...p, fitnessLevel: e.target.value }))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">{t("clients.detail.placeholder_select")}</option>
                <option value="beginner">{t("clients.detail.level_beginner")}</option>
                <option value="intermediate">{t("clients.detail.level_intermediate")}</option>
                <option value="advanced">{t("clients.detail.level_advanced")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("clients.detail.label_primary_goal")}</Label>
              <select
                value={profileForm.primaryGoal}
                onChange={e => setProfileForm(p => ({ ...p, primaryGoal: e.target.value }))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="">{t("clients.detail.placeholder_select")}</option>
                <option value="strength">{t("clients.detail.goal_strength")}</option>
                <option value="muscle">{t("clients.detail.goal_muscle")}</option>
                <option value="fat_loss">{t("clients.detail.goal_fat_loss")}</option>
                <option value="performance">{t("clients.detail.goal_performance")}</option>
                <option value="health">{t("clients.detail.goal_health")}</option>
                <option value="aesthetic">{t("clients.detail.goal_aesthetic")}</option>
                <option value="fitness">{t("clients.detail.goal_fitness")}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)} className="border-border">
              {t("clients.detail.btn_cancel")}
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("clients.detail.btn_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-display">{t("clients.detail.unlink_dialog_title", { name: client.firstName })}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t("clients.detail.unlink_dialog_desc", { fullName: `${client.firstName} ${client.lastName ?? ""}`.trim() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t("clients.detail.btn_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("clients.detail.btn_unlink_confirm")}
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
                <AlertTriangle className="w-5 h-5" /> {t("clients.detail.active_alerts_title")}
              </div>
              <div className="grid gap-2">
                {client.activeAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-destructive/20">
                    <div>
                      <span className="text-xs font-mono text-destructive uppercase mr-2">[{alert.priority}]</span>
                      <span className="text-sm text-white">{alert.message}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white" onClick={() => handleResolveAlert(alert.id)}>
                      {t("clients.detail.btn_resolve")} <CheckCircle2 className="w-3 h-3 ml-1" />
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
                  <CardTitle className="text-xl font-display tracking-widest text-white">{t("clients.detail.card_title_score_evolution")}</CardTitle>
                  <div className="flex items-center gap-1 bg-background p-1 rounded-md border border-border">
                    <button 
                      onClick={() => setChartRange(7)} 
                      className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", chartRange === 7 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}
                    >
                      {t("clients.detail.range_7d")}
                    </button>
                    <button 
                      onClick={() => setChartRange(30)} 
                      className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", chartRange === 30 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}
                    >
                      {t("clients.detail.range_30d")}
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
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">{t("clients.detail.not_enough_data")}</div>
                  )}
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-display text-muted-foreground tracking-widest mb-3 uppercase">{t("clients.detail.form_today")}</h3>
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
                    {t("clients.detail.no_checkin_today")}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Cycle tracking (read-only) — visible only when athlete has enabled it */}
              {client.cycleTracking && (
                <Card className="bg-card border border-[#A855F7]/30 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display tracking-widest text-[#A855F7]">{t("clients.detail.cycle_title")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {client.lastPeriodDate ? (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("clients.detail.cycle_last_period")}</span>
                          <span className="text-white font-mono">
                            {format(new Date(client.lastPeriodDate + "T12:00:00"), 'd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("clients.detail.cycle_duration")}</span>
                          <span className="text-white font-mono">{client.avgCycleDays ?? 28} j</span>
                        </div>
                        {(() => {
                          const daysSince = Math.floor((Date.now() - new Date(client.lastPeriodDate + "T12:00:00").getTime()) / 86400000);
                          const cycle = client.avgCycleDays ?? 28;
                          const dayInCycle = ((daysSince % cycle) + cycle) % cycle + 1;
                          let phase = t("clients.detail.cycle_phase_luteal");
                          let phaseColor = "#F59E0B";
                          if (dayInCycle <= 5) { phase = t("clients.detail.cycle_phase_menstrual"); phaseColor = "#EF4444"; }
                          else if (dayInCycle <= 13) { phase = t("clients.detail.cycle_phase_follicular"); phaseColor = "#22C55E"; }
                          else if (dayInCycle <= 16) { phase = t("clients.detail.cycle_phase_ovulatory"); phaseColor = "#00F0FF"; }
                          return (
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-muted-foreground">{t("clients.detail.cycle_phase")}</span>
                              <span className="font-semibold text-xs px-2 py-0.5 rounded-full" style={{ color: phaseColor, backgroundColor: `${phaseColor}20` }}>
                                {phase} (J{dayInCycle})
                              </span>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">{t("clients.detail.cycle_no_date")}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Monthly calendar planning */}
              <Card className="bg-card border-border shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      {t("clients.detail.planning_title")}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeProgram && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 border-primary/30 text-primary hover:bg-primary/10 gap-1"
                          onClick={() => {
                            setAddDateValue(new Date().toISOString().split("T")[0]);
                            setAddDateOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          {t("clients.detail.btn_add_session")}
                        </Button>
                      )}
                      <button
                        onClick={() => setCalendarMonth(m => {
                          const d = new Date(m.year, m.month - 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-mono text-white capitalize min-w-[120px] text-center">
                        {format(new Date(calendarMonth.year, calendarMonth.month, 1), 'MMMM yyyy', { locale: fr })}
                      </span>
                      <button
                        onClick={() => setCalendarMonth(m => {
                          const d = new Date(m.year, m.month + 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSessionTimelineExpanded(e => !e)}
                        className="text-muted-foreground hover:text-white transition-colors ml-1"
                      >
                        {sessionTimelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                {sessionTimelineExpanded && (
                  <CardContent className="pt-0">
                    {/* Calendar grid */}
                    {(() => {
                      const { year, month } = calendarMonth;
                      const firstOfMonth = new Date(year, month, 1);
                      const lastOfMonth = new Date(year, month + 1, 0);
                      const firstDow = firstOfMonth.getDay();
                      const mondayOffset = firstDow === 0 ? -6 : 1 - firstDow;
                      const calStart = new Date(firstOfMonth);
                      calStart.setDate(firstOfMonth.getDate() + mondayOffset);

                      const weeks: Date[][] = [];
                      const d = new Date(calStart);
                      while (d <= lastOfMonth) {
                        const week: Date[] = [];
                        for (let i = 0; i < 7; i++) {
                          week.push(new Date(d));
                          d.setDate(d.getDate() + 1);
                        }
                        weeks.push(week);
                      }

                      const sessionsByDate = new Map<string, UpcomingSession[]>();
                      for (const s of client.upcomingSessions ?? []) {
                        const arr = sessionsByDate.get(s.scheduledDate) ?? [];
                        arr.push(s);
                        sessionsByDate.set(s.scheduledDate, arr);
                      }

                      const todayStr = new Date().toISOString().split("T")[0];
                      const DAY_HEADERS = t("clients.detail.day_headers", { returnObjects: true }) as string[];

                      const handleDayClick = (day: Date) => {
                        if (!activeProgram?.startDate) return;
                        const progStart = new Date(activeProgram.startDate);
                        progStart.setHours(0, 0, 0, 0);
                        const target = new Date(day);
                        target.setHours(0, 0, 0, 0);
                        const diff = Math.floor((target.getTime() - progStart.getTime()) / 86400000);
                        if (diff < 0) return;
                        const weekNumber = Math.floor(diff / 7) + 1;
                        const dayNumber = (diff % 7) + 1;
                        setAddSessionSlot({ weekNumber, dayNumber });
                      };

                      return (
                        <div className="overflow-x-auto">
                          <div className="min-w-[450px]">
                          <div className="grid grid-cols-7 gap-px mb-1">
                            {DAY_HEADERS.map(h => (
                              <div key={h} className="text-center text-[10px] font-mono text-muted-foreground uppercase py-1">
                                {h}
                              </div>
                            ))}
                          </div>
                          <div className="space-y-px">
                            {weeks.map((week, wi) => (
                              <div key={wi} className="grid grid-cols-7 gap-px">
                                {week.map((day, di) => {
                                  const dateStr = day.toISOString().split("T")[0];
                                  const isCurrentMonth = day.getMonth() === month;
                                  const isToday = dateStr === todayStr;
                                  const isPast = dateStr < todayStr;
                                  const daySessions = sessionsByDate.get(dateStr) ?? [];
                                  const canAdd = !!activeProgram?.startDate && isCurrentMonth && !isPast;

                                  return (
                                    <div
                                      key={di}
                                      onClick={() => canAdd && handleDayClick(day)}
                                      className={cn(
                                        "min-h-[64px] p-1 rounded-md transition-colors relative",
                                        isCurrentMonth ? "bg-background" : "bg-transparent opacity-30",
                                        isToday ? "ring-1 ring-primary/50 bg-primary/5" : "",
                                        canAdd && daySessions.length === 0 ? "hover:bg-white/5 cursor-pointer group" : "",
                                        !isCurrentMonth ? "pointer-events-none" : ""
                                      )}
                                    >
                                      <div className={cn(
                                        "text-[11px] font-mono mb-1 w-5 h-5 flex items-center justify-center rounded-full",
                                        isToday ? "bg-primary text-black font-bold" :
                                        isPast ? "text-muted-foreground" : "text-white"
                                      )}>
                                        {day.getDate()}
                                      </div>
                                      <div className="space-y-0.5">
                                        {daySessions.map(s => (
                                          <div
                                            key={s.sessionId}
                                            onClick={e => { e.stopPropagation(); setSelectedCalSession(s); }}
                                            className={cn(
                                              "text-[9px] px-1 py-0.5 rounded font-medium leading-tight cursor-pointer hover:opacity-80 transition-opacity",
                                              s.isCompleted ? "bg-primary/20 text-primary" :
                                              dateStr < todayStr ? "bg-destructive/20 text-destructive" :
                                              dateStr === todayStr ? "bg-primary/30 text-primary" :
                                              "bg-white/10 text-white"
                                            )}
                                            title={`${s.sessionName}${s.sessionType ? ` · ${sessionTypeLabel(s.sessionType)}` : ""}`}
                                          >
                                            <div className="truncate">{s.isCompleted ? "✓ " : ""}{s.sessionName}</div>
                                            {s.sessionType && (
                                              <div className="text-[8px] opacity-60 font-mono truncate">
                                                {sessionTypeLabel(s.sessionType)}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {canAdd && daySessions.length === 0 && (
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus className="w-3 h-3 text-primary mx-auto" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                          </div>
                          {!activeProgram && (
                            <p className="text-xs text-muted-foreground text-center mt-3 italic">
                              {t("clients.detail.no_active_program_calendar")}
                            </p>
                          )}
                          {activeProgram && !activeProgram.startDate && (
                            <div className="flex flex-col items-center gap-2 mt-3">
                              <p className="text-xs text-muted-foreground italic">
                                {t("clients.detail.program_no_start_date")}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => openActivateDialog(activeProgram.id)}
                                className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 h-7 text-xs"
                              >
                                {t("clients.detail.btn_activate")}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Weekly volume chart + month comparison (MET-03) */}
                    {client.recentSessions.length >= 2 && (() => {
                      const now = new Date();
                      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

                      const getIsoWeek = (d: Date) => {
                        const tmp = new Date(d);
                        tmp.setHours(0, 0, 0, 0);
                        tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
                        const week1 = new Date(tmp.getFullYear(), 0, 4);
                        return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
                      };

                      const weekMap = new Map<string, number>();
                      let thisMonthCount = 0;
                      let lastMonthCount = 0;
                      for (const s of client.recentSessions) {
                        if (!s.completedAt) continue;
                        const d = new Date(s.completedAt);
                        const wk = `S${getIsoWeek(d)}`;
                        weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
                        if (d >= thisMonthStart) thisMonthCount++;
                        else if (d >= lastMonthStart && d <= lastMonthEnd) lastMonthCount++;
                      }

                      const weekData = Array.from(weekMap.entries()).slice(-6).map(([week, count]) => ({ week, count }));
                      const trend = thisMonthCount > lastMonthCount ? "up" : thisMonthCount < lastMonthCount ? "down" : "same";

                      return (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
                            {t("clients.detail.weekly_volume_title")}
                          </div>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="text-xs text-muted-foreground">
                              {t("clients.detail.this_month_sessions", { count: thisMonthCount })}
                            </div>
                            <div className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              <span>{t("clients.detail.vs_last_month", { count: lastMonthCount })}</span>
                            </div>
                          </div>
                          {weekData.length >= 2 && (
                            <div className="h-[80px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weekData} barSize={20} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                  <RechartsTooltip
                                    contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 6, fontSize: 11 }}
                                    formatter={(v: number | string) => [t("clients.detail.session_count", { count: Number(v) }), t("clients.detail.volume_label")]}
                                    labelStyle={{ color: "#94a3b8" }}
                                  />
                                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                    {weekData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={index === weekData.length - 1 ? "#00F5A0" : "#00F5A040"}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* RPE chart + consecutive high-RPE alert (DASH-V2-02) */}
                    {(() => {
                      const withRpe = client.recentSessions
                        .filter(s => s.completedAt && s.rpe != null)
                        .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

                      const rpeData = withRpe.slice(-10).map(s => ({
                        date: format(new Date(s.completedAt!), 'd MMM', { locale: fr }),
                        rpe: s.rpe as number,
                      }));

                      const avgRpe = withRpe.length > 0
                        ? Math.round((withRpe.reduce((sum, s) => sum + (s.rpe as number), 0) / withRpe.length) * 10) / 10
                        : null;

                      const consecutiveHighRpe = (() => {
                        const sorted = [...withRpe].sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
                        let count = 0;
                        for (const s of sorted) {
                          if ((s.rpe as number) > 8) count++;
                          else break;
                        }
                        return count;
                      })();

                      if (rpeData.length === 0) return null;

                      return (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                {t("clients.detail.rpe_title")}
                              </div>
                              {avgRpe !== null && (
                                <div className={cn(
                                  "text-[10px] font-mono px-2 py-0.5 rounded border",
                                  avgRpe > 8 ? "text-destructive border-destructive/30 bg-destructive/10" :
                                  avgRpe > 6 ? "text-amber-400 border-amber-400/30 bg-amber-400/10" :
                                  "text-green-400 border-green-400/30 bg-green-400/10"
                                )}>
                                  {t("clients.detail.rpe_avg", { value: avgRpe })}
                                </div>
                              )}
                            </div>
                            {consecutiveHighRpe >= 3 && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/30 px-2.5 py-1 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                {t("clients.detail.rpe_consecutive_alert", { count: consecutiveHighRpe })}
                              </div>
                            )}
                          </div>
                          <div className="h-[90px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={rpeData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 5, 8, 10]} />
                                <RechartsTooltip
                                  contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 6, fontSize: 11 }}
                                  formatter={(v: number | string) => [`${v}/10`, t("clients.detail.tooltip_rpe_label")]}
                                  labelStyle={{ color: "#94a3b8" }}
                                />
                                <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 2" opacity={0.5} />
                                <Line
                                  type="monotone"
                                  dataKey="rpe"
                                  strokeWidth={2}
                                  dot={(props: { cx?: number; cy?: number; payload?: { rpe?: number } }) => {
                                    const { cx, cy, payload } = props;
                                    if (cx == null || cy == null) return <g />;
                                    const rpe = payload?.rpe ?? 0;
                                    const color = rpe > 8 ? "#ef4444" : rpe > 6 ? "#f59e0b" : "#22c55e";
                                    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
                                  }}
                                  stroke="#f59e0b"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recent sessions */}
                    {client.recentSessions.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-border">
                        <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                          {t("clients.detail.recent_sessions_title")}
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
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs font-medium text-white">
                                          {session.completedAt ? format(new Date(session.completedAt), 'd MMM yyyy', { locale: fr }) : t("clients.detail.session_incomplete")}
                                        </div>
                                        {session.isFreeSession && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                                            {t("clients.detail.free_session_label")}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-1.5">
                                        <ModeBadge mode={session.variantMode} />
                                        {session.freeSessionName && (
                                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{session.freeSessionName}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                      <div className="text-[10px] text-muted-foreground uppercase">RPE</div>
                                      <div className={cn(
                                        "text-sm font-mono",
                                        session.rpe == null ? "text-muted-foreground" :
                                        (session.rpe as number) > 8 ? "text-destructive" :
                                        (session.rpe as number) > 6 ? "text-amber-400" :
                                        "text-green-400"
                                      )}>
                                        {session.rpe ?? '--'}<span className="text-xs text-muted-foreground">/10</span>
                                      </div>
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
                                      <p className="text-xs text-destructive py-3">{t("clients.detail.session_load_error")}</p>
                                    )}
                                    {detail && detail !== "loading" && detail !== "error" && (
                                      <div className="pt-3 space-y-3">
                                        {detail.durationMin && (
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {t("clients.detail.real_duration")} <span className="text-white font-medium">{detail.durationMin} min</span>
                                          </div>
                                        )}
                                        {detail.athleteNotes && (
                                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <span className="mt-0.5">📝</span>
                                            <span>{t("clients.detail.athlete_notes_label")} <span className="text-white/80 italic">"{detail.athleteNotes}"</span></span>
                                          </div>
                                        )}
                                        {detail.exercises.length === 0 ? (
                                          <p className="text-xs text-muted-foreground italic">{t("clients.detail.no_exercise_recorded")}</p>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                              <thead>
                                                <tr className="text-muted-foreground font-mono uppercase text-[10px]">
                                                  <th className="text-left pb-2 pr-3">{t("clients.detail.col_exercise")}</th>
                                                  <th className="text-center pb-2 pr-2">{t("clients.detail.col_prescribed")}</th>
                                                  <th className="text-center pb-2 pr-2">{t("clients.detail.col_actual")}</th>
                                                  <th className="text-center pb-2">{t("clients.detail.col_diff")}</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-border/30">
                                                {detail.exercises.map(ex => {
                                                  const presLoad = ex.prescribed?.loadKg ?? null;
                                                  const realLoad = ex.actual.loadKgUsed ?? null;
                                                  const diff = presLoad !== null && realLoad !== null ? realLoad - presLoad : null;
                                                  const prescribedSets = ex.prescribed?.sets ?? null;
                                                  const actualSets = ex.actual.setsCompleted ?? null;
                                                  const bonusSets = prescribedSets !== null && actualSets !== null
                                                    ? Math.max(0, actualSets - prescribedSets)
                                                    : 0;
                                                  return (
                                                    <tr key={ex.exerciseId} className="hover:bg-white/[0.02]">
                                                      <td className="py-2 pr-3 text-white font-medium truncate max-w-[120px]">{ex.exerciseName}</td>
                                                      <td className="py-2 pr-2 text-center text-muted-foreground">
                                                        {ex.prescribed
                                                          ? <span>{ex.prescribed.sets}×{ex.prescribed.reps ?? '?'}{ex.prescribed.loadKg ? ` @${ex.prescribed.loadKg}kg` : ''}</span>
                                                          : <span className="italic">—</span>}
                                                      </td>
                                                      <td className="py-2 pr-2 text-center">
                                                        <span className={cn("font-medium", bonusSets > 0 ? "text-amber-400" : "text-white")}>
                                                          {ex.actual.setsCompleted ?? '?'}×
                                                          {Array.isArray(ex.actual.repsPerSet)
                                                            ? (ex.actual.repsPerSet as number[]).join(',')
                                                            : '?'}
                                                          {realLoad ? ` @${realLoad}kg` : ''}
                                                        </span>
                                                        {bonusSets > 0 && (
                                                          <span className="ml-1.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wide bg-amber-400/10 border border-amber-400/30 text-amber-400">
                                                            +{bonusSets}
                                                          </span>
                                                        )}
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

              {/* Session info dialog — clicking existing calendar session */}
              <Dialog open={!!selectedCalSession} onOpenChange={o => !o && setSelectedCalSession(null)}>
                <DialogContent className="bg-card border-border max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-white font-display text-lg flex items-center gap-2">
                      {selectedCalSession?.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      ) : selectedCalSession && selectedCalSession.scheduledDate < new Date().toISOString().split("T")[0] ? (
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                      ) : (
                        <Calendar className="w-5 h-5 text-accent shrink-0" />
                      )}
                      {selectedCalSession?.sessionName}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedCalSession && (
                    <div className="space-y-3 py-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="capitalize">
                          {format(new Date(selectedCalSession.scheduledDate + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      {selectedCalSession.estimatedDurationMin && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {t("clients.detail.duration_estimated")} <span className="text-white font-medium">{selectedCalSession.estimatedDurationMin} min</span>
                        </div>
                      )}
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium",
                        selectedCalSession.isCompleted
                          ? "text-primary border-primary/30 bg-primary/10"
                          : selectedCalSession.scheduledDate < new Date().toISOString().split("T")[0]
                          ? "text-destructive border-destructive/30 bg-destructive/10"
                          : "text-accent border-accent/30 bg-accent/10"
                      )}>
                        {selectedCalSession.isCompleted ? t("clients.detail.session_done") :
                         selectedCalSession.scheduledDate < new Date().toISOString().split("T")[0] ? t("clients.detail.session_missed") :
                         t("clients.detail.session_upcoming")}
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    {activeProgram && (
                      <Link href={`/programs/${activeProgram.id}`} onClick={() => setSelectedCalSession(null)}>
                        <Button size="sm" variant="outline" className="border-border gap-1.5 text-muted-foreground hover:text-white">
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t("clients.detail.edit_in_program")}
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" onClick={() => setSelectedCalSession(null)} className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">
                      {t("clients.detail.close")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Date picker dialog — "Ajouter une séance" button */}
              <Dialog open={addDateOpen} onOpenChange={o => { if (!o) setAddDateOpen(false); }}>
                <DialogContent className="bg-card border-border max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-white font-display text-lg flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      {t("clients.detail.btn_add_session")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">{t("clients.detail.session_date_label")}</Label>
                      <Input
                        type="date"
                        value={addDateValue}
                        onChange={e => setAddDateValue(e.target.value)}
                        className="bg-background border-border text-white"
                        min={activeProgram?.startDate ?? undefined}
                      />
                    </div>
                    {activeProgram?.startDate && addDateValue && (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const progStart = new Date(activeProgram.startDate);
                          progStart.setHours(0, 0, 0, 0);
                          const target = new Date(addDateValue + "T12:00:00");
                          target.setHours(0, 0, 0, 0);
                          const diff = Math.floor((target.getTime() - progStart.getTime()) / 86400000);
                          if (diff < 0) return t("clients.detail.date_before_program_start");
                          const weekNumber = Math.floor(diff / 7) + 1;
                          const dayNumber = (diff % 7) + 1;
                          return t("clients.detail.week_day_program", { week: weekNumber, day: dayNumber });
                        })()}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button size="sm" variant="ghost" onClick={() => setAddDateOpen(false)}>
                      {t("clients.detail.btn_cancel")}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary text-black hover:bg-primary/90"
                      disabled={!activeProgram?.startDate || !addDateValue}
                      onClick={() => {
                        if (!activeProgram?.startDate || !addDateValue) return;
                        const progStart = new Date(activeProgram.startDate);
                        progStart.setHours(0, 0, 0, 0);
                        const target = new Date(addDateValue + "T12:00:00");
                        target.setHours(0, 0, 0, 0);
                        const diff = Math.floor((target.getTime() - progStart.getTime()) / 86400000);
                        if (diff < 0) return;
                        const weekNumber = Math.floor(diff / 7) + 1;
                        const dayNumber = (diff % 7) + 1;
                        setAddDateOpen(false);
                        setAddSessionSlot({ weekNumber, dayNumber });
                      }}
                    >
                      {t("clients.detail.continue")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add session modal from calendar click or date picker */}
              {addSessionSlot && activeProgram && (
                <SessionModal
                  programId={activeProgram.id}
                  weekNumber={addSessionSlot.weekNumber}
                  dayNumber={addSessionSlot.dayNumber}
                  open={!!addSessionSlot}
                  onClose={() => setAddSessionSlot(null)}
                  onSaved={() => {
                    setAddSessionSlot(null);
                    refetch();
                  }}
                />
              )}
            </div>

            {/* SIDEBAR — Training context */}
            <div className="space-y-4">
              <Card className="bg-card border-border shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display tracking-widest text-white flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    {t("clients.detail.training_context_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {extClient?.trainingContext !== null && client.fitnessLevel && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">{t("clients.detail.ctx_level")}</span>
                      <span className="text-white font-medium capitalize">{levelLabel(client.fitnessLevel)}</span>
                    </div>
                  )}
                  {extClient?.trainingContext !== null && client.primaryGoal && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">{t("clients.detail.ctx_primary_goal")}</span>
                      <span className="text-white font-medium">{goalLabel(client.primaryGoal)}</span>
                    </div>
                  )}
                  {extClient?.trainingContext !== null && extClient?.secondaryGoal && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">{t("clients.detail.ctx_secondary_goal")}</span>
                      <span className="text-white font-medium capitalize">{extClient.secondaryGoal.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {(extClient?.trainingContext?.availableDays?.length ?? 0) > 0 && (
                    <div className="py-1.5 border-b border-border/60">
                      <div className="text-muted-foreground mb-1.5">{t("clients.detail.ctx_available_days")}</div>
                      <div className="flex flex-wrap gap-1">
                        {(["lun","mar","mer","jeu","ven","sam","dim"] as const).map(d => {
                          const isActive = extClient?.trainingContext?.availableDays.includes(d) ?? false;
                          return (
                            <span key={d} className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-mono uppercase",
                              isActive ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-border/30"
                            )}>{d}</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(extClient?.trainingContext?.trainingLocations?.length ?? 0) > 0 && (
                    <div className="py-1.5 border-b border-border/60">
                      <div className="text-muted-foreground mb-1.5">{t("clients.detail.ctx_location")}</div>
                      <div className="flex flex-wrap gap-1">
                        {(extClient?.trainingContext?.trainingLocations ?? []).map((loc) => {
                          const label = t(`clients.detail.location_${loc}`, { defaultValue: loc });
                          return (
                            <span key={loc} className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">{label}</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(extClient?.trainingContext?.equipment?.length ?? 0) > 0 && (
                    <div className="py-1.5 border-b border-border/60">
                      <div className="text-muted-foreground mb-1.5">{t("clients.detail.ctx_equipment")}</div>
                      <div className="flex flex-wrap gap-1">
                        {(extClient?.trainingContext?.equipment ?? []).map((eq) => {
                          const label = t(`clients.detail.equipment_${eq}`, { defaultValue: eq });
                          return (
                            <span key={eq} className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-muted-foreground border border-border/40">{label}</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(extClient?.trainingContext?.sessionDurationMin || extClient?.trainingContext?.sessionDurationMax) && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">{t("clients.detail.ctx_session_duration")}</span>
                      <span className="text-white font-medium">
                        {extClient?.trainingContext?.sessionDurationMin && extClient?.trainingContext?.sessionDurationMax
                          ? `${extClient.trainingContext.sessionDurationMin}–${extClient.trainingContext.sessionDurationMax} min`
                          : extClient?.trainingContext?.sessionDurationMin
                          ? `≥ ${extClient.trainingContext.sessionDurationMin} min`
                          : `≤ ${extClient?.trainingContext?.sessionDurationMax} min`}
                      </span>
                    </div>
                  )}
                  {extClient?.trainingContext?.injuries && (
                    <div className="py-1.5">
                      <div className="text-muted-foreground mb-1">{t("clients.detail.ctx_injuries")}</div>
                      <p className="text-white/80 text-xs italic leading-relaxed">
                        {extClient.trainingContext.injuries}
                      </p>
                    </div>
                  )}
                  {!client?.fitnessLevel && !client?.primaryGoal && !(extClient?.trainingContext?.availableDays?.length) && (
                    <p className="text-muted-foreground text-xs italic text-center py-2">
                      {t("clients.detail.ctx_no_data")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* TESTS TAB */}
      {activeTab === "tests" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display text-white">{t("clients.detail.tests_title")}</h2>
            <Button
              onClick={() => {
                setTestForm({ testType: "1rm_squat", customType: "", exerciseName: "", value: "", unit: "kg", testedAt: new Date().toISOString().split("T")[0], notes: "" });
                setAddTestOpen(true);
              }}
              className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 gap-1.5"
              size="sm"
            >
              <Plus className="w-4 h-4" /> {t("clients.detail.btn_new_test")}
            </Button>
          </div>

          {testsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : tests !== null && tests.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-white font-medium mb-1">{t("clients.detail.no_tests_recorded")}</p>
              <p className="text-muted-foreground text-sm">{t("clients.detail.no_tests_hint")}</p>
            </div>
          ) : tests !== null && tests.length > 0 ? (() => {
            const testTypes = Array.from(new Set(tests.map(t => t.testType)));
            const activeType = selectedTestType ?? testTypes[0];
            const typeTests = tests.filter(t => t.testType === activeType).sort((a, b) => a.testedAt.localeCompare(b.testedAt));
            const chartData = typeTests.map(t => ({
              date: format(new Date(t.testedAt + "T12:00:00"), 'd MMM yy', { locale: fr }),
              value: t.value,
              unit: t.unit,
            }));
            const predefined = PREDEFINED_TEST_TYPES.find(p => p.value === activeType);
            const typeLabel = predefined?.label ?? activeType.replace(/_/g, " ");
            const unit = typeTests[0]?.unit ?? "";
            const latest = typeTests[typeTests.length - 1];
            const prev = typeTests[typeTests.length - 2];
            const delta = latest && prev ? latest.value - prev.value : null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Type selector sidebar */}
                <div className="lg:col-span-1 space-y-1">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{t("clients.detail.test_type_sidebar")}</p>
                  {testTypes.map(type => {
                    const label = testTypeLabel(type);
                    const typeRecords = tests.filter(t => t.testType === type);
                    const lastRecord = typeRecords.sort((a, b) => b.testedAt.localeCompare(a.testedAt))[0];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedTestType(type)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          activeType === type
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:text-white hover:border-white/20"
                        )}
                      >
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] mt-0.5 font-mono">
                          {lastRecord ? `${lastRecord.value} ${lastRecord.unit} · ${format(new Date(lastRecord.testedAt + "T12:00:00"), 'd MMM yy', { locale: fr })}` : "—"}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Chart + table */}
                <div className="lg:col-span-3 space-y-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-display text-white tracking-wider">{typeLabel}</CardTitle>
                        {latest && (
                          <div className="text-right">
                            <div className="text-2xl font-display text-white">
                              {latest.value}
                              <span className="text-sm text-muted-foreground ml-1">{unit}</span>
                            </div>
                            {delta !== null && (
                              <div className={cn("text-xs flex items-center justify-end gap-0.5 font-mono", delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                                {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                {delta > 0 ? "+" : ""}{delta.toFixed(1)} {t("clients.detail.delta_vs_prev")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {chartData.length >= 2 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(v: number) => [`${v} ${unit}`, typeLabel]}
                              />
                              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--background))', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground italic">
                          {t("clients.detail.chart_min_2")}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* History table */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{t("clients.detail.history_title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Mobile: cards */}
                      <div className="sm:hidden divide-y divide-border/30">
                        {[...typeTests].reverse().map((test, i) => {
                          const prevTest = [...typeTests].reverse()[i + 1];
                          const d = prevTest ? test.value - prevTest.value : null;
                          return (
                            <div key={test.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(test.testedAt + "T12:00:00"), 'd MMM yyyy', { locale: fr })}
                                </div>
                                <div className="font-display text-white text-base">
                                  {test.value} <span className="text-xs text-muted-foreground">{test.unit}</span>
                                  {d !== null && (
                                    <span className={cn(
                                      "ml-2 text-[10px] font-mono",
                                      d > 0 ? "text-primary" : d < 0 ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                      {d > 0 ? "+" : ""}{d === 0 ? "±0" : d.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setDeleteTestId(test.id)}
                                className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                aria-label={t("clients.detail.delete_test_aria")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {/* Desktop: table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-4 text-xs font-mono text-muted-foreground uppercase">{t("clients.detail.col_date")}</th>
                              <th className="text-right py-2 px-4 text-xs font-mono text-muted-foreground uppercase">{t("clients.detail.col_result")}</th>
                              <th className="text-right py-2 px-4 text-xs font-mono text-muted-foreground uppercase">{t("clients.detail.col_variation")}</th>
                              <th className="py-2 px-4" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {[...typeTests].reverse().map((test, i) => {
                              const prevTest = [...typeTests].reverse()[i + 1];
                              const d = prevTest ? test.value - prevTest.value : null;
                              return (
                                <tr key={test.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-2.5 px-4 text-muted-foreground text-sm">
                                    {format(new Date(test.testedAt + "T12:00:00"), 'd MMMM yyyy', { locale: fr })}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-display text-white text-base">
                                    {test.value} <span className="text-xs text-muted-foreground">{test.unit}</span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    {d === null ? (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    ) : d > 0 ? (
                                      <span className="text-primary text-xs font-mono">+{d.toFixed(1)}</span>
                                    ) : d < 0 ? (
                                      <span className="text-destructive text-xs font-mono">{d.toFixed(1)}</span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">±0</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <button
                                      onClick={() => setDeleteTestId(test.id)}
                                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })() : null}

          {/* Add test dialog */}
          <Dialog open={addTestOpen} onOpenChange={o => !o && setAddTestOpen(false)}>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-white tracking-widest">{t("clients.detail.dialog_new_test")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("clients.detail.label_test_type")}</Label>
                  <select
                    value={testForm.testType}
                    onChange={e => {
                      const p = PREDEFINED_TEST_TYPES.find(pt => pt.value === e.target.value);
                      setTestForm(f => ({ ...f, testType: e.target.value, unit: p?.unit || f.unit }));
                    }}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-white text-sm"
                  >
                    {PREDEFINED_TEST_TYPES.map(p => (
                      <option key={p.value} value={p.value}>{testTypeLabel(p.value)}</option>
                    ))}
                  </select>
                </div>
                {testForm.testType === "custom" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("clients.detail.label_test_name")}</Label>
                    <Input
                      value={testForm.customType}
                      onChange={e => setTestForm(f => ({ ...f, customType: e.target.value }))}
                      placeholder={t("clients.detail.placeholder_test_name")}
                      className="bg-background border-border text-white"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("clients.detail.label_result")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={testForm.value}
                      onChange={e => setTestForm(f => ({ ...f, value: e.target.value }))}
                      placeholder="0"
                      className="bg-background border-border text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("clients.detail.label_unit")}</Label>
                    <Input
                      value={testForm.unit}
                      onChange={e => setTestForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder={t("clients.detail.placeholder_unit")}
                      className="bg-background border-border text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("clients.detail.label_test_date")}</Label>
                  <Input
                    type="date"
                    value={testForm.testedAt}
                    onChange={e => setTestForm(f => ({ ...f, testedAt: e.target.value }))}
                    className="bg-background border-border text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t("clients.detail.label_notes_optional")}</Label>
                  <Input
                    value={testForm.notes}
                    onChange={e => setTestForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t("clients.detail.placeholder_notes")}
                    className="bg-background border-border text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddTestOpen(false)} className="border-border">{t("clients.detail.btn_cancel")}</Button>
                <Button
                  onClick={handleAddTest}
                  disabled={testSaving || !testForm.value || !testForm.unit}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  {testSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("clients.detail.btn_save_record")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete test confirmation */}
          <AlertDialog open={!!deleteTestId} onOpenChange={o => !o && setDeleteTestId(null)}>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white font-display">{t("clients.detail.delete_test_title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("clients.detail.delete_test_desc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">{t("clients.detail.btn_cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => deleteTestId && handleDeleteTest(deleteTestId)}
                  disabled={testDeleting}
                >
                  {testDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("clients.detail.btn_delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* NUTRITION TAB */}
      {activeTab === "nutrition" && (
        <CoachNutritionPanel athleteId={id ?? ""} />
      )}

      {/* PROGRAMME TAB */}
      {activeTab === "programme" && (
        <div className="space-y-6">
          {activeProgram ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-display text-white">{activeProgram.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary uppercase tracking-wider">{t("clients.detail.program_active")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("clients.detail.program_weeks", { count: activeProgram.durationWeeks })}
                    {activeProgram.startDate && ` · ${t("clients.detail.program_started_on", { date: format(new Date(activeProgram.startDate + "T12:00:00"), 'd MMMM yyyy', { locale: fr }) })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!activeProgram.startDate && (
                    <Button
                      size="sm"
                      onClick={() => openActivateDialog(activeProgram.id)}
                      className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 h-8 text-xs gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {t("clients.detail.btn_activate")}
                    </Button>
                  )}
                  <Link href={`/programs/${activeProgram.id}`}>
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-white gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("clients.detail.program_full_view")}
                    </Button>
                  </Link>
                </div>
              </div>
              <ProgramGrid programId={activeProgram.id} />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-white font-medium mb-1">{t("clients.detail.program_no_active")}</p>
              <p className="text-muted-foreground text-sm mb-4">{t("clients.detail.program_no_active_hint")}</p>
              <Link href="/programs">
                <Button className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">
                  {t("clients.detail.btn_create_program")}
                </Button>
              </Link>
            </div>
          )}

          {inactivePrograms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-display text-muted-foreground tracking-widest uppercase">{t("clients.detail.other_programs")}</h3>
              <div className="grid gap-3">
                {inactivePrograms.map(prog => (
                  <div key={prog.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{prog.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("clients.detail.program_short_weeks", { count: prog.durationWeeks })}
                        {prog.startDate ? ` · ${t("clients.detail.program_started_on", { date: format(new Date(prog.startDate + "T12:00:00"), 'd MMM yyyy', { locale: fr }) })}` : ` · ${t("clients.detail.program_not_started")}`}
                        {(prog.sessionCount ?? 0) > 0 && ` · ${t("clients.detail.session_count", { count: prog.sessionCount ?? 0 })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Link href={`/programs/${prog.id}`}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white h-8 px-2">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => openActivateDialog(prog.id)}
                        className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 h-8 text-xs"
                      >
                        {t("clients.detail.btn_activate")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-display text-xl">{t("clients.detail.dialog_activate_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{t("clients.detail.label_start_date")}</Label>
              <Input
                type="date"
                value={activateStartDate}
                onChange={e => setActivateStartDate(e.target.value)}
                className="bg-background border-border text-white"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("clients.detail.dialog_activate_desc")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)} className="border-border">
              {t("clients.detail.btn_cancel")}
            </Button>
            <Button
              onClick={handleActivateProgram}
              disabled={activating || !activateStartDate}
              className="bg-primary hover:bg-primary/90"
            >
              {activating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("clients.detail.btn_activate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
