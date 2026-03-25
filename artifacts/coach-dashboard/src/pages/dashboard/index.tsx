import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ModeBadge, cn } from "@/components/ui/mode-badge";
import {
  Loader2, Calendar, CheckCircle2, Clock, Zap, Users, TrendingUp,
  AlertTriangle, ChevronLeft, ChevronRight, X, BarChart2, Plus, MapPin, Pencil, Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import {
  useCreateCoachAppointment,
  useUpdateCoachAppointment,
  useDeleteCoachAppointment,
  type CoachAppointment,
} from "@workspace/api-client-react";

interface DashboardAthlète {
  id: string;
  firstName: string;
  lastName: string | null;
  adaptScore: number | null;
  sessionMode: string | null;
  hasCheckin: boolean;
  lastCheckinDate: string | null;
  daysSinceCheckin: number | null;
}

interface SessionEntry {
  athleteId: string;
  athleteName: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  scheduledDate: string;
  estimatedDurationMin: number | null;
  isCompleted: boolean;
  isMissed: boolean;
}

interface DashboardCompleted {
  id: string;
  athleteId: string;
  athleteName: string;
  sessionName: string;
  variantMode: string;
  rpe: number | null;
  completedAt: string | null;
}

interface DashboardAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  type: string;
  priority: string;
  message: string;
  createdAt: string | null;
}

interface DashboardData {
  todayAthletes: DashboardAthlète[];
  upcomingSessions: SessionEntry[];
  pastSessions: SessionEntry[];
  recentCompleted: DashboardCompleted[];
  activeAlerts: DashboardAlert[];
}

interface CalendarSession {
  athleteId: string;
  athleteName: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  estimatedDurationMin: number | null;
  isCompleted: boolean;
  isMissed: boolean;
  isAppointment?: boolean;
  appointmentStartAt?: string;
}

interface CalendarDay {
  date: string;
  sessions: CalendarSession[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`/api/coach/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur chargement dashboard");
  return res.json();
}

async function fetchCalendar(year: number, month: number): Promise<CalendarDay[]> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`/api/coach/calendar?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur chargement calendrier");
  return res.json();
}

interface WeeklyVolume { week: string; count: number; }

async function fetchWeeklyVolume(): Promise<WeeklyVolume[]> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`/api/coach/volume-weekly`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error();
  return res.json();
}

const MODE_BG: Record<string, string> = {
  performance: "bg-[#00F5A0]/10 border-[#00F5A0]/30",
  normal: "bg-[#00F0FF]/10 border-[#00F0FF]/30",
  adapt: "bg-[#FFB800]/10 border-[#FFB800]/30",
  recovery: "bg-[#A855F7]/10 border-[#A855F7]/30",
};

const MODE_COLORS: Record<string, string> = {
  performance: "text-[#00F5A0]",
  normal: "text-[#00F0FF]",
  adapt: "text-[#FFB800]",
  recovery: "text-[#A855F7]",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hybrid: "Hybride",
  mobility: "Mobilité",
  sport: "Sport",
  mixed: "Mixte",
};

type AthleteFilter = "tous" | "actif" | "inactif";

export default function Dashboard() {
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>("tous");
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [apptDialog, setApptDialog] = useState<{
    open: boolean;
    editing: CoachAppointment | null;
    date: string;
    time: string;
    athleteId: string;
    durationMin: number;
    location: string;
    notes: string;
  }>({ open: false, editing: null, date: "", time: "10:00", athleteId: "", durationMin: 60, location: "", notes: "" });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/coach/dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  });

  const { data: calendarData, refetch: refetchCalendar } = useQuery<CalendarDay[]>({
    queryKey: ["/api/coach/calendar", calendarMonth.year, calendarMonth.month],
    queryFn: () => fetchCalendar(calendarMonth.year, calendarMonth.month),
  });

  const { data: weeklyVolumeRaw } = useQuery<WeeklyVolume[]>({
    queryKey: ["/api/coach/volume-weekly"],
    queryFn: fetchWeeklyVolume,
    staleTime: 60000,
  });

  const { mutate: createAppt, isPending: creatingAppt } = useCreateCoachAppointment({
    mutation: {
      onSuccess: () => {
        void refetchCalendar();
        setApptDialog(d => ({ ...d, open: false }));
      },
    },
  });
  const { mutate: updateAppt, isPending: updatingAppt } = useUpdateCoachAppointment({
    mutation: {
      onSuccess: () => {
        void refetchCalendar();
        setApptDialog(d => ({ ...d, open: false }));
      },
    },
  });
  const { mutate: deleteAppt } = useDeleteCoachAppointment({
    mutation: {
      onSuccess: () => {
        void refetchCalendar();
        void queryClient.invalidateQueries({ queryKey: ["/api/coach/appointments"] });
      },
    },
  });

  function openNewApptDialog(dateStr: string) {
    setApptDialog({ open: true, editing: null, date: dateStr, time: "10:00", athleteId: "", durationMin: 60, location: "", notes: "" });
  }

  function openEditApptDialog(s: CalendarSession) {
    if (!s.isAppointment || !s.appointmentStartAt) return;
    const dt = new Date(s.appointmentStartAt);
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    setApptDialog({
      open: true,
      editing: { id: s.sessionId, athleteId: s.athleteId, startAt: s.appointmentStartAt, durationMin: s.estimatedDurationMin ?? 60, location: s.sessionName.replace("RDV — ", ""), notes: "", type: "presentiel", coachId: "" },
      date: s.appointmentStartAt.split("T")[0] ?? "",
      time: `${hh}:${mm}`,
      athleteId: s.athleteId,
      durationMin: s.estimatedDurationMin ?? 60,
      location: s.sessionName.startsWith("RDV — ") ? s.sessionName.replace("RDV — ", "") : "",
      notes: "",
    });
  }

  function submitApptDialog() {
    if (!apptDialog.athleteId || !apptDialog.date) return;
    const startAt = `${apptDialog.date}T${apptDialog.time}:00`;
    if (apptDialog.editing) {
      updateAppt({ id: apptDialog.editing.id, data: { startAt, durationMin: apptDialog.durationMin, location: apptDialog.location || undefined, notes: apptDialog.notes || undefined } });
    } else {
      createAppt({ data: { athleteId: apptDialog.athleteId, startAt, durationMin: apptDialog.durationMin, location: apptDialog.location || undefined, notes: apptDialog.notes || undefined } });
    }
  }

  const today = new Date();
  const dayStr = format(today, "EEEE d MMMM yyyy", { locale: fr });
  const dayStrCapitalized = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
  const todayStr = today.toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm italic">
        Impossible de charger le tableau de bord.
      </div>
    );
  }

  const { todayAthletes, upcomingSessions, pastSessions, recentCompleted, activeAlerts } = data;

  const inactiveAthletes = todayAthletes.filter(a => a.daysSinceCheckin === null || a.daysSinceCheckin >= 3);
  const activeAthletes = todayAthletes.filter(a => a.hasCheckin);
  const filteredAthletes = athleteFilter === "actif"
    ? activeAthletes
    : athleteFilter === "inactif"
    ? inactiveAthletes
    : todayAthletes;

  const totalCheckins = todayAthletes.filter(a => a.hasCheckin).length;
  const adaptCount = todayAthletes.filter(a => a.sessionMode === "adapt").length;
  const avgScore = todayAthletes.filter(a => a.adaptScore !== null).length > 0
    ? Math.round(
        todayAthletes.filter(a => a.adaptScore !== null).reduce((s, a) => s + (a.adaptScore ?? 0), 0) /
        todayAthletes.filter(a => a.adaptScore !== null).length
      )
    : null;

  const completionRate = upcomingSessions.length > 0
    ? Math.round((upcomingSessions.filter(s => s.isCompleted).length / upcomingSessions.length) * 100)
    : null;

  // Weekly volume chart data: format IYYY-IW → "Sem. N"
  const weeklyVolumeData = (weeklyVolumeRaw ?? []).map(row => {
    const [, weekNum] = row.week.split("-W").length > 1
      ? row.week.split("-W")
      : row.week.split("-");
    return { semaine: `S${weekNum ?? row.week}`, séances: row.count };
  });

  // Calendar grid computation
  const { year, month } = calendarMonth;
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
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

  const calSessionsByDate = new Map<string, CalendarSession[]>();
  for (const day of calendarData ?? []) {
    calSessionsByDate.set(day.date, day.sessions);
  }

  const selectedDaySessions = selectedDate ? (calSessionsByDate.get(selectedDate) ?? []) : [];

  const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-display text-white">TABLEAU DE BORD</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue opérationnelle du jour · {dayStrCapitalized}</p>
      </div>

      {/* DASH-01: Active alerts banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            {activeAlerts.length} alerte{activeAlerts.length > 1 ? "s" : ""} active{activeAlerts.length > 1 ? "s" : ""}
          </div>
          <div className="space-y-1">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0",
                    alert.priority === "HI"
                      ? "text-destructive border-destructive/40 bg-destructive/10"
                      : "text-accent border-accent/40 bg-accent/10"
                  )}>
                    {alert.priority}
                  </span>
                  <Link href={`/clients/${alert.athleteId}`} className="text-sm text-white hover:text-primary transition-colors truncate">
                    <span className="font-semibold">{alert.athleteName}</span>
                    <span className="text-muted-foreground"> — {alert.message}</span>
                  </Link>
                </div>
              </div>
            ))}
            {activeAlerts.length > 0 && (
              <Link href="/alerts" className="text-xs text-primary hover:underline">
                Voir toutes les alertes →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> Athlètes actifs
            </div>
            <div className="text-3xl font-display text-white">{todayAthletes.length}</div>
            <div className="text-xs text-muted-foreground">{totalCheckins} check-in{totalCheckins !== 1 ? "s" : ""} aujourd'hui</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" /> Score ADAPT moyen
            </div>
            <div className={cn("text-3xl font-display", avgScore !== null ? (avgScore >= 60 ? "text-primary" : avgScore >= 40 ? "text-accent" : "text-destructive") : "text-muted-foreground")}>
              {avgScore !== null ? avgScore : "--"}
            </div>
            <div className="text-xs text-muted-foreground">Score du jour (sur 100)</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" /> Taux complétion
            </div>
            <div className={cn("text-3xl font-display", completionRate !== null ? (completionRate >= 70 ? "text-primary" : completionRate >= 40 ? "text-accent" : "text-destructive") : "text-muted-foreground")}>
              {completionRate !== null ? `${completionRate}%` : "--"}
            </div>
            <div className="text-xs text-muted-foreground">séances (7 jours)</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Mode ADAPT
            </div>
            <div className="text-3xl font-display text-accent">{adaptCount}</div>
            <div className="text-xs text-muted-foreground">athlète{adaptCount !== 1 ? "s" : ""} en mode adapté</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's athletes (DASH-01: operational view) */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                AUJOURD'HUI
              </CardTitle>
              <div className="flex items-center gap-1">
                {(["tous", "actif", "inactif"] as AthleteFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setAthleteFilter(f)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                      athleteFilter === f
                        ? f === "inactif"
                          ? "bg-destructive/20 text-destructive border border-destructive/30"
                          : "bg-primary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    {f === "tous" ? `Tous (${todayAthletes.length})` : f === "actif" ? `Actifs (${activeAthletes.length})` : `Inactifs (${inactiveAthletes.length})`}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredAthletes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm italic">
                {athleteFilter === "inactif" ? "Aucun athlète inactif — bravo !" : "Aucun athlète dans votre équipe."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAthletes.map(athlete => (
                  <Link key={athlete.id} href={`/clients/${athlete.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group border border-transparent hover:border-border cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                          {athlete.firstName[0]}{athlete.lastName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                            {athlete.firstName} {athlete.lastName}
                          </div>
                          {athlete.hasCheckin ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Check-in reçu
                            </div>
                          ) : athlete.daysSinceCheckin !== null && athlete.daysSinceCheckin >= 3 ? (
                            <div className="flex items-center gap-1.5 text-xs text-destructive">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                              Inactif depuis {athlete.daysSinceCheckin}j
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              Pas de check-in aujourd'hui
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {athlete.adaptScore !== null && (
                          <span className={cn("text-lg font-display", athlete.adaptScore >= 60 ? "text-primary" : athlete.adaptScore >= 40 ? "text-accent" : "text-destructive")}>
                            {athlete.adaptScore}
                          </span>
                        )}
                        {athlete.sessionMode ? (
                          <ModeBadge mode={athlete.sessionMode} />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">En attente</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DASH-02: Upcoming sessions (next 7 days) */}
        <div className="space-y-4">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                SÉANCES À VENIR
                <span className="text-xs font-mono text-muted-foreground font-normal ml-1">7 jours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingSessions.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm italic">
                  Aucune séance planifiée dans les 7 prochains jours.
                </div>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                  {upcomingSessions.map(s => (
                    <SessionRow key={s.sessionId} session={s} todayStr={todayStr} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DASH-02: Past sessions with status */}
          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                SÉANCES PASSÉES
                <span className="text-xs font-mono text-muted-foreground font-normal ml-1">7 derniers jours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {pastSessions.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm italic">
                  Aucune séance passée ces 7 derniers jours.
                </div>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                  {pastSessions.map(s => (
                    <PastSessionRow key={s.sessionId} session={s} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DASH-02: Monthly calendar */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              CALENDRIER MENSUEL
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedDate ? openNewApptDialog(selectedDate) : openNewApptDialog(todayStr)}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <Plus className="w-3 h-3" />
                RDV
              </button>
              <button
                onClick={() => setCalendarMonth(m => {
                  const d = new Date(m.year, m.month - 2, 1);
                  return { year: d.getFullYear(), month: d.getMonth() + 1 };
                })}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono text-white capitalize min-w-[130px] text-center">
                {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr })}
              </span>
              <button
                onClick={() => setCalendarMonth(m => {
                  const d = new Date(m.year, m.month, 1);
                  return { year: d.getFullYear(), month: d.getMonth() + 1 };
                })}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 gap-px mb-2">
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
                  const isCurrentMonth = day.getMonth() === month - 1;
                  const isToday = dateStr === todayStr;
                  const isPast = dateStr < todayStr;
                  const daySessions = calSessionsByDate.get(dateStr) ?? [];
                  const isSelected = selectedDate === dateStr;

                  return (
                    <div
                      key={di}
                      onClick={() => isCurrentMonth && setSelectedDate(isSelected ? null : dateStr)}
                      className={cn(
                        "min-h-[60px] p-1 rounded-md transition-colors relative",
                        isCurrentMonth ? "cursor-pointer bg-background hover:bg-white/5" : "bg-transparent opacity-30 pointer-events-none",
                        isToday ? "ring-1 ring-primary/50 bg-primary/5 hover:bg-primary/10" : "",
                        isSelected ? "ring-2 ring-accent/60 bg-accent/5" : "",
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
                        {daySessions.slice(0, 3).map(s => (
                          <div
                            key={s.sessionId}
                            className={cn(
                              "text-[8px] px-1 py-0.5 rounded truncate leading-tight",
                              s.isAppointment ? "bg-amber-500/20 text-amber-400" :
                              s.isCompleted ? "bg-primary/20 text-primary" :
                              s.isMissed ? "bg-destructive/20 text-destructive" :
                              isToday ? "bg-accent/20 text-accent" :
                              "bg-white/10 text-muted-foreground"
                            )}
                            title={`${s.athleteName} — ${s.sessionName}`}
                          >
                            {s.isAppointment ? "📍" : ""}{s.athleteName.split(" ")[0]}
                          </div>
                        ))}
                        {daySessions.length > 3 && (
                          <div className="text-[8px] text-muted-foreground px-1">+{daySessions.length - 3}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-mono text-white capitalize">
                  {format(new Date(selectedDate + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openNewApptDialog(selectedDate)}
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />RDV
                  </button>
                  <button onClick={() => setSelectedDate(null)} className="text-muted-foreground hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selectedDaySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune séance ce jour.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDaySessions.map(s => (
                    s.isAppointment ? (
                      <div key={s.sessionId} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-300">{s.sessionName}</p>
                            <p className="text-xs text-muted-foreground">{s.athleteName}</p>
                            {s.appointmentStartAt && (
                              <p className="text-[10px] text-amber-400/70 font-mono">
                                {format(new Date(s.appointmentStartAt), "HH:mm")} · {s.estimatedDurationMin}min
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditApptDialog(s)}
                            className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { if (window.confirm("Supprimer ce RDV ?")) deleteAppt({ id: s.sessionId }); }}
                            className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Link key={s.sessionId} href={`/clients/${s.athleteId}`}>
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              s.isCompleted ? "bg-primary" : s.isMissed ? "bg-destructive" : "bg-accent"
                            )} />
                            <div>
                              <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">{s.sessionName}</p>
                              <p className="text-xs text-muted-foreground">{s.athleteName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.estimatedDurationMin && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />{s.estimatedDurationMin}min
                              </span>
                            )}
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                              s.isCompleted ? "text-primary border-primary/30 bg-primary/10" :
                              s.isMissed ? "text-destructive border-destructive/30 bg-destructive/10" :
                              "text-muted-foreground border-border bg-white/5"
                            )}>
                              {s.isCompleted ? "✓ Réalisée" : s.isMissed ? "✗ Manquée" : "À venir"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MET-03: Weekly volume chart */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#A855F7]" />
            VOLUME HEBDOMADAIRE
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {weeklyVolumeData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm italic">
              Aucune séance complétée ces 8 dernières semaines.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyVolumeData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
                <XAxis dataKey="semaine" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #333", borderRadius: 8 }}
                  labelStyle={{ color: "#fff", fontSize: 12 }}
                  itemStyle={{ color: "#A855F7" }}
                  formatter={(v: number) => [`${v} séance${v > 1 ? "s" : ""}`, "Volume"]}
                />
                <Bar dataKey="séances" fill="#A855F7" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent completed sessions */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#00F5A0]" />
            DERNIÈRES SÉANCES TERMINÉES
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentCompleted.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm italic">
              Aucune séance complétée ces 7 derniers jours.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase font-mono border-b border-border">
                  <tr>
                    <th className="py-2 pr-4">Athlète</th>
                    <th className="py-2 pr-4">Séance</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4 text-center">RPE</th>
                    <th className="py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentCompleted.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <Link href={`/clients/${log.athleteId}`} className="text-white hover:text-primary transition-colors font-medium text-sm">
                          {log.athleteName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-sm">{log.sessionName}</td>
                      <td className="py-3 pr-4">
                        <span className={cn(
                          "text-xs font-mono px-2 py-0.5 rounded-full border",
                          MODE_BG[log.variantMode] ?? "bg-white/5 border-white/10 text-muted-foreground"
                        )}>
                          <span className={MODE_COLORS[log.variantMode] ?? "text-muted-foreground"}>
                            {log.variantMode.toUpperCase()}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {log.rpe !== null ? (
                          <span className={cn("text-sm font-display", log.rpe >= 8 ? "text-destructive" : log.rpe >= 6 ? "text-accent" : "text-primary")}>
                            {log.rpe}<span className="text-xs text-muted-foreground">/10</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-xs text-muted-foreground font-mono">
                        {log.completedAt ? format(new Date(log.completedAt), "d MMM HH:mm", { locale: fr }) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment dialog */}
      {apptDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-display tracking-widest text-white">
                {apptDialog.editing ? "MODIFIER LE RDV" : "NOUVEAU RDV PRÉSENTIEL"}
              </h2>
              <button onClick={() => setApptDialog(d => ({ ...d, open: false }))} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!apptDialog.editing && (
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Athlète</label>
                  <select
                    value={apptDialog.athleteId}
                    onChange={e => setApptDialog(d => ({ ...d, athleteId: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="">— Sélectionner —</option>
                    {todayAthletes.map(a => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName ?? ""}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={apptDialog.date}
                    onChange={e => setApptDialog(d => ({ ...d, date: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Heure</label>
                  <input
                    type="time"
                    value={apptDialog.time}
                    onChange={e => setApptDialog(d => ({ ...d, time: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Durée (min)</label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={apptDialog.durationMin}
                  onChange={e => setApptDialog(d => ({ ...d, durationMin: parseInt(e.target.value) || 60 }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Lieu (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex : Salle de sport, Domicile..."
                  value={apptDialog.location}
                  onChange={e => setApptDialog(d => ({ ...d, location: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Notes (optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="Notes pour ce RDV..."
                  value={apptDialog.notes}
                  onChange={e => setApptDialog(d => ({ ...d, notes: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setApptDialog(d => ({ ...d, open: false }))}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitApptDialog}
                disabled={!apptDialog.athleteId || !apptDialog.date || creatingAppt || updatingAppt}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {(creatingAppt || updatingAppt) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {apptDialog.editing ? "Modifier" : "Créer le RDV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, todayStr }: { session: SessionEntry; todayStr: string }) {
  const isToday = session.scheduledDate === todayStr;
  return (
    <Link href={`/clients/${session.athleteId}`}>
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer group",
        isToday ? "bg-primary/5 border border-primary/20 hover:bg-primary/10" : "hover:bg-white/5",
        session.isCompleted && "opacity-60"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {session.isCompleted ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0] shrink-0" />
          ) : (
            <div className={cn("w-3.5 h-3.5 rounded-full border shrink-0", isToday ? "border-primary bg-primary/20" : "border-muted-foreground")} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-white truncate group-hover:text-primary transition-colors">{session.sessionName}</p>
            <p className="text-xs text-muted-foreground">{session.athleteName} · {format(new Date(session.scheduledDate + "T12:00:00"), "EEE d MMM", { locale: fr })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {session.estimatedDurationMin && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {session.estimatedDurationMin}min
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PastSessionRow({ session }: { session: SessionEntry }) {
  return (
    <Link href={`/clients/${session.athleteId}`}>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
        <div className="flex items-center gap-2.5 min-w-0">
          {session.isCompleted ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0] shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm text-white truncate group-hover:text-primary transition-colors">{session.sessionName}</p>
            <p className="text-xs text-muted-foreground">{session.athleteName} · {format(new Date(session.scheduledDate + "T12:00:00"), "EEE d MMM", { locale: fr })}</p>
          </div>
        </div>
        <span className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0",
          session.isCompleted
            ? "text-primary border-primary/30 bg-primary/10"
            : "text-destructive border-destructive/30 bg-destructive/10"
        )}>
          {session.isCompleted ? "✓ Réalisée" : "✗ Manquée"}
        </span>
      </div>
    </Link>
  );
}
