import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ModeBadge, cn } from "@/components/ui/mode-badge";
import { Loader2, Calendar, CheckCircle2, Clock, Zap, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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

interface DashboardSession {
  athleteId: string;
  athleteName: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  scheduledDate: string;
  estimatedDurationMin: number | null;
  isCompleted: boolean;
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

interface DashboardData {
  todayAthletes: DashboardAthlète[];
  weekSessions: DashboardSession[];
  recentCompleted: DashboardCompleted[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`${import.meta.env.BASE_URL}api/coach/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur chargement dashboard");
  return res.json();
}

const MODE_COLORS: Record<string, string> = {
  performance: "text-[#00F5A0]",
  normal: "text-[#00F0FF]",
  adapt: "text-[#FFB800]",
  recovery: "text-[#A855F7]",
};

const MODE_BG: Record<string, string> = {
  performance: "bg-[#00F5A0]/10 border-[#00F5A0]/30",
  normal: "bg-[#00F0FF]/10 border-[#00F0FF]/30",
  adapt: "bg-[#FFB800]/10 border-[#FFB800]/30",
  recovery: "bg-[#A855F7]/10 border-[#A855F7]/30",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: "Force",
  cardio: "Cardio",
  hybrid: "Hybride",
  mobility: "Mobilité",
};

type AthleteFilter = "tous" | "actif" | "inactif";

export default function Dashboard() {
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>("tous");
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/coach/dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  });

  const today = new Date();
  const dayStr = format(today, "EEEE d MMMM yyyy", { locale: fr });
  const dayStrCapitalized = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);

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

  const { todayAthletes, weekSessions, recentCompleted } = data;

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
    ? Math.round(todayAthletes.filter(a => a.adaptScore !== null).reduce((s, a) => s + (a.adaptScore ?? 0), 0) / todayAthletes.filter(a => a.adaptScore !== null).length)
    : null;

  const todaySessionsPlanned = weekSessions.filter(s => isToday(parseISO(s.scheduledDate)));
  const otherWeekSessions = weekSessions.filter(s => !isToday(parseISO(s.scheduledDate)));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-display text-white">TABLEAU DE BORD</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue opérationnelle du jour · {dayStrCapitalized}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> Athlètes
            </div>
            <div className="text-3xl font-display text-white">{todayAthletes.length}</div>
            <div className="text-xs text-muted-foreground">{totalCheckins} check-in{totalCheckins !== 1 ? "s" : ""} aujourd'hui</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" /> Score moyen
            </div>
            <div className={cn("text-3xl font-display", avgScore !== null ? (avgScore >= 60 ? "text-primary" : avgScore >= 40 ? "text-accent" : "text-destructive") : "text-muted-foreground")}>
              {avgScore !== null ? avgScore : "--"}
            </div>
            <div className="text-xs text-muted-foreground">ADAPT Score du jour</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Mode ADAPT
            </div>
            <div className="text-3xl font-display text-accent">{adaptCount}</div>
            <div className="text-xs text-muted-foreground">athlète{adaptCount !== 1 ? "s" : ""} en mode ADAPT</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" /> Cette semaine
            </div>
            <div className="text-3xl font-display text-white">{weekSessions.length}</div>
            <div className="text-xs text-muted-foreground">{weekSessions.filter(s => s.isCompleted).length} terminée{weekSessions.filter(s => s.isCompleted).length !== 1 ? "s" : ""}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's athletes */}
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

        {/* This week's sessions */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-display tracking-widest text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              SÉANCES DE LA SEMAINE
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {weekSessions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm italic">
                Aucune séance planifiée cette semaine.
              </div>
            ) : (
              <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                {todaySessionsPlanned.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2">Aujourd'hui</p>
                    {todaySessionsPlanned.map(s => (
                      <SessionRow key={s.sessionId} session={s} highlight />
                    ))}
                  </div>
                )}
                {otherWeekSessions.length > 0 && (
                  <div>
                    {todaySessionsPlanned.length > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 mt-3">Reste de la semaine</p>
                    )}
                    {otherWeekSessions.map(s => (
                      <SessionRow key={s.sessionId} session={s} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}

function SessionRow({ session, highlight = false }: { session: DashboardSession; highlight?: boolean }) {
  return (
    <Link href={`/clients/${session.athleteId}`}>
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer group",
        highlight ? "bg-primary/5 border border-primary/20 hover:bg-primary/10" : "hover:bg-white/5",
        session.isCompleted && "opacity-60"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {session.isCompleted ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0] shrink-0" />
          ) : (
            <div className={cn("w-3.5 h-3.5 rounded-full border shrink-0", highlight ? "border-primary bg-primary/20" : "border-muted-foreground")} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-white truncate group-hover:text-primary transition-colors">{session.sessionName}</p>
            <p className="text-xs text-muted-foreground">{session.athleteName}</p>
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
