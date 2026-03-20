import { useGetAlerts, useResolveAlert } from "@workspace/api-client-react";
import { Loader2, AlertTriangle, CheckCircle2, User, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AlertsFeed() {
  const { data: alerts, isLoading, refetch } = useGetAlerts({ query: { queryKey: ['/api/coach/alerts'], refetchInterval: 30000 }});
  const resolveMutation = useResolveAlert();
  const { toast } = useToast();
  const [filter, setFilter] = useState("unresolved");

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleResolve = async (alertId: string, note: string) => {
    try {
      await resolveMutation.mutateAsync({ alertId, data: { resolutionNote: note } });
      toast({ title: "Alert resolved" });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Sort: high -> medium -> low, then by date desc
  const priorityWeight = { high: 3, medium: 2, low: 1 } as Record<string, number>;
  
  let displayedAlerts = alerts || [];
  if (filter === "unresolved") {
    displayedAlerts = displayedAlerts.filter(a => !a.isResolved);
  }

  const sortedAlerts = [...displayedAlerts].sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" /> ALERT FEED
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time athlete interventions and warnings.</p>
        </div>
      </div>

      <div className="bg-card border border-border p-2 rounded-lg inline-flex">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-transparent">
            <TabsTrigger value="unresolved" className="data-[state=active]:bg-background">Unresolved Only</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-background">All Alerts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {sortedAlerts.map(alert => {
          const isP1 = alert.priority === 'high';
          const isP2 = alert.priority === 'medium';
          
          let cardStyle = "border-border bg-card";
          let badgeStyle = "bg-muted text-muted-foreground";
          
          if (!alert.isResolved) {
            if (isP1) {
              cardStyle = "border-destructive bg-destructive/5 shadow-[0_0_15px_rgba(255,59,92,0.1)]";
              badgeStyle = "bg-destructive text-white";
            } else if (isP2) {
              cardStyle = "border-accent bg-accent/5";
              badgeStyle = "bg-accent text-accent-foreground";
            }
          } else {
            cardStyle = "border-border bg-background/50 opacity-60";
          }

          return (
            <div key={alert.id} className={`p-5 rounded-xl border transition-all ${cardStyle}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${badgeStyle}`}>
                      {alert.priority} PRIORITY
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : ''}
                    </span>
                    {alert.isResolved && (
                      <span className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Resolved</span>
                    )}
                  </div>
                  
                  <div className="text-lg text-white font-medium">{alert.message}</div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <Link href={`/clients/${alert.athleteId}`} className="hover:text-primary flex items-center gap-1 transition-colors">
                      <User className="w-4 h-4" /> {alert.athleteName}
                    </Link>
                    <span className="text-border">•</span>
                    <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                  </div>
                </div>

                {!alert.isResolved && (
                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                    {isP1 && (
                      <Button 
                        size="sm" 
                        className="bg-destructive hover:bg-destructive/90 text-white"
                        onClick={() => handleResolve(alert.id, "Recovery Validated")}
                        disabled={resolveMutation.isPending}
                      >
                        Validate Recovery
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/10 hover:bg-white/5"
                      onClick={() => handleResolve(alert.id, "Reviewed")}
                      disabled={resolveMutation.isPending}
                    >
                      Mark Resolved
                    </Button>
                    <Link href={`/messages/${alert.athleteId}`}>
                      <Button size="sm" variant="ghost" className="w-full text-muted-foreground hover:text-white">
                        <MessageSquare className="w-4 h-4 mr-2" /> Message
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sortedAlerts.length === 0 && (
          <div className="py-20 text-center text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-primary/50 mb-3" />
            <p className="text-lg text-white">All clear.</p>
            <p className="text-sm">No alerts require your attention right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
