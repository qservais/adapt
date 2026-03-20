import { useState } from "react";
import { Link, useParams } from "wouter";
import { 
  useGetClientDetail, 
  useOverrideClientSession, 
  useResolveAlert,
  AlertData 
} from "@workspace/api-client-react";
import { ModeBadge, cn } from "@/components/ui/mode-badge";
import { Loader2, ArrowLeft, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading, refetch } = useGetClientDetail(id, { query: { queryKey: [`/api/coach/clients/${id}`], refetchInterval: 30000 }});
  const [chartRange, setChartRange] = useState<7 | 30>(7);
  const overrideMutation = useOverrideClientSession();
  const resolveMutation = useResolveAlert();
  const { toast } = useToast();

  if (isLoading || !client) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleOverride = async (mode: 'performance' | 'normal' | 'adapt' | 'recovery') => {
    try {
      await overrideMutation.mutateAsync({ clientId: id, data: { mode } });
      toast({ title: "Session Overridden", description: `Set to ${mode.toUpperCase()}` });
      refetch();
    } catch {
      toast({ title: "Override failed", variant: "destructive" });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveMutation.mutateAsync({ alertId, data: { resolutionNote: "Resolved via dashboard" } });
      toast({ title: "Alert Resolved" });
      refetch();
    } catch {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    }
  };

  // Chart Data preparation
  const chartData = client.recentCheckins
    .slice(0, chartRange)
    .reverse()
    .map(c => ({
      date: format(new Date(c.date), 'MMM dd'),
      score: c.adaptScore
    }));

  const metrics = [
    { name: "Sleep", value: client.todayCheckin?.sleep },
    { name: "Energy", value: client.todayCheckin?.energy },
    { name: "Stress", value: client.todayCheckin?.stress },
    { name: "Soreness", value: client.todayCheckin?.soreness },
    { name: "Motivation", value: client.todayCheckin?.motivation },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Roster
        </Link>
      </div>

      {/* Header Profile */}
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
              {client.fitnessLevel && <span>• Level: <span className="text-white capitalize">{client.fitnessLevel}</span></span>}
              {client.primaryGoal && <span>• Goal: <span className="text-white capitalize">{client.primaryGoal}</span></span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          <Link href={`/messages/${client.id}`}>
            <Button variant="outline" className="w-full justify-start hover-elevate">
              <MessageSquare className="w-4 h-4 mr-2" /> Message Athlete
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-start bg-white/5 hover:bg-white/10 text-white border border-white/10 hover-elevate" disabled={overrideMutation.isPending}>
                Override Today's Session
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => handleOverride('performance')} className="text-[#00F5A0] focus:bg-[#00F5A0]/10">Force PERFORMANCE</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('normal')} className="text-[#00D9FF] focus:bg-[#00D9FF]/10">Force NORMAL</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('adapt')} className="text-[#FFB800] focus:bg-[#FFB800]/10">Force ADAPT</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOverride('recovery')} className="text-[#7B61FF] focus:bg-[#7B61FF]/10">Force RECOVERY</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {client.activeAlerts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-bold uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5" /> Active Alerts
          </div>
          <div className="grid gap-2">
            {client.activeAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-destructive/20">
                <div>
                  <span className="text-xs font-mono text-destructive uppercase mr-2">[{alert.priority}]</span>
                  <span className="text-sm text-white">{alert.message}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white" onClick={() => handleResolveAlert(alert.id)}>
                  Resolve <CheckCircle2 className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Charts & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-display tracking-widest text-white">ADAPT SCORE TREND</CardTitle>
              <div className="flex items-center gap-1 bg-background p-1 rounded-md border border-border">
                <button 
                  onClick={() => setChartRange(7)} 
                  className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", chartRange === 7 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}
                >
                  7D
                </button>
                <button 
                  onClick={() => setChartRange(30)} 
                  className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", chartRange === 30 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}
                >
                  30D
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
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">Not enough data</div>
              )}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-display text-muted-foreground tracking-widest mb-3 uppercase">Today's Readiness</h3>
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
                No check-in submitted today.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Sessions */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-lg h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-display tracking-widest text-white">RECENT SESSIONS</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-3 pr-2">
                {client.recentSessions.length > 0 ? client.recentSessions.slice(0, 10).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-white/20 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {session.completedAt ? format(new Date(session.completedAt), 'MMM dd') : 'Incomplete'}
                      </div>
                      <div className="mt-1">
                        <ModeBadge mode={session.variantMode} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground uppercase">RPE</div>
                      <div className="text-lg font-mono text-white">{session.rpe || '--'}<span className="text-xs text-muted-foreground">/10</span></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground text-sm italic py-8">No recent sessions found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
