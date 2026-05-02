import { useTranslation } from "react-i18next";
import { useGetAlerts, useResolveAlert } from "@workspace/api-client-react";
import { Loader2, AlertTriangle, CheckCircle2, User, MessageSquare, RotateCcw, Clock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const PRIORITY_WEIGHT: Record<string, number> = { p1: 3, p2: 2, p3: 1 };

const PRIORITY_STYLE: Record<string, { card: string; badge: string; label: string }> = {
  p1: {
    card: "border-destructive bg-destructive/5 shadow-[0_0_15px_rgba(255,59,92,0.1)]",
    badge: "bg-destructive text-white",
    label: "P1 CRITIQUE",
  },
  p2: {
    card: "border-accent bg-accent/5",
    badge: "bg-accent text-accent-foreground",
    label: "P2 ATTENTION",
  },
  p3: {
    card: "border-border bg-card",
    badge: "bg-muted text-muted-foreground",
    label: "P3 INFO",
  },
};

async function reopenAlertFn(alertId: string): Promise<void> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch(`/api/coach/alerts/${alertId}/reopen`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erreur serveur");
}

type AlertItem = {
  id: string;
  athleteId: string;
  athleteName: string;
  type: string;
  priority: string;
  message: string;
  isRead: boolean | null;
  isResolved: boolean | null;
  resolvedAt: string | Date | null;
  resolutionNote?: string | null;
  createdAt: string | Date | null;
};

export default function AlertsFeed() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: alerts, isLoading, refetch } = useGetAlerts({
    query: { queryKey: ["/api/coach/alerts"], refetchInterval: 30000 },
  });
  const resolveMutation = useResolveAlert();
  const reopenMutation = useMutation({
    mutationFn: reopenAlertFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/alerts"] });
      refetch();
    },
  });
  const { toast } = useToast();
  const [filter, setFilter] = useState("unresolved");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleResolve = async (alertId: string, note: string) => {
    try {
      await resolveMutation.mutateAsync({ alertId, data: { resolutionNote: note } });
      toast({ title: "Alerte résolue" });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/dashboard"] });
    } catch {
      toast({ title: "Échec de la résolution", variant: "destructive" });
    }
  };

  const handleReopen = async (alertId: string) => {
    try {
      await reopenMutation.mutateAsync(alertId);
      toast({ title: "Alerte réouverte" });
    } catch {
      toast({ title: "Échec de la réouverture", variant: "destructive" });
    }
  };

  const allAlerts = (alerts || []) as AlertItem[];
  let displayedAlerts = allAlerts;
  if (filter === "unresolved") {
    displayedAlerts = allAlerts.filter((a) => !a.isResolved);
  } else if (filter === "resolved") {
    displayedAlerts = allAlerts.filter((a) => a.isResolved);
  }

  const sortedAlerts = [...displayedAlerts].sort((a, b) => {
    if (filter === "resolved") {
      return (
        new Date(b.resolvedAt || b.createdAt || 0).getTime() -
        new Date(a.resolvedAt || a.createdAt || 0).getTime()
      );
    }
    const pDiff =
      (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return (
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
    );
  });

  const unresolvedCount = allAlerts.filter(a => !a.isResolved).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" /> FLUX D'ALERTES
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("alerts.subtitle")}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border p-2 rounded-lg inline-flex">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-transparent">
            <TabsTrigger value="unresolved" className="data-[state=active]:bg-background">
              Non résolues
              {unresolvedCount > 0 && (
                <span className="ml-1.5 bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                  {unresolvedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-background">
              Résolues
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-background">
              Toutes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {sortedAlerts.map((alert) => {
          const priority = alert.priority?.toLowerCase() || "p3";
          const style = PRIORITY_STYLE[priority] || PRIORITY_STYLE["p3"];
          const isP1 = priority === "p1";

          const cardStyle = alert.isResolved
            ? "border-border bg-background/50"
            : style.card;
          const badgeStyle = alert.isResolved
            ? "bg-muted text-muted-foreground"
            : style.badge;

          return (
            <div
              key={alert.id}
              className={`p-5 rounded-xl border transition-all ${cardStyle}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${badgeStyle}`}
                    >
                      {style.label}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {alert.createdAt
                        ? formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : ""}
                    </span>
                    {alert.isResolved && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Résolu
                      </span>
                    )}
                  </div>

                  <div className="text-lg text-white font-medium">{alert.message}</div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                    <Link
                      href={`/clients/${alert.athleteId}`}
                      className="hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      <User className="w-4 h-4" /> {alert.athleteName}
                    </Link>
                    <span className="text-border">•</span>
                    <span className="capitalize">
                      {alert.type.replace("_", " ")}
                    </span>
                  </div>

                  {alert.isResolved && (
                    <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                      {alert.resolvedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-primary/60" />
                          Résolu le {format(new Date(alert.resolvedAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      )}
                      {alert.resolutionNote && (
                        <p className="text-xs text-white/80 italic">
                          « {alert.resolutionNote} »
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                  {!alert.isResolved ? (
                    <>
                      {isP1 && (
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90 text-white"
                          onClick={() =>
                            handleResolve(alert.id, "Récupération validée")
                          }
                          disabled={resolveMutation.isPending}
                        >
                          Valider la récupération
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => handleResolve(alert.id, "Vérifié")}
                        disabled={resolveMutation.isPending}
                      >
                        Marquer résolu
                      </Button>
                      <Link href={`/messages/${alert.athleteId}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-muted-foreground hover:text-white"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" /> Message
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 hover:bg-white/5 text-muted-foreground"
                      onClick={() => handleReopen(alert.id)}
                      disabled={reopenMutation.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Rouvrir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sortedAlerts.length === 0 && (
          <div className="py-20 text-center text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-primary/50 mb-3" />
            <p className="text-lg text-white">
              {filter === "resolved" ? t("alerts.no_alerts_resolved", "Aucune alerte résolue.") : t("alerts.no_alerts_all")}
            </p>
            <p className="text-sm">
              {filter === "resolved"
                ? "Les alertes résolues apparaîtront ici avec la date et la note de résolution."
                : "Aucune alerte ne nécessite votre attention pour le moment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
