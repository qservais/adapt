import { useState } from "react";
import { Link } from "wouter";
import {
  useGetClients, useCoachLink, useGetInviteCode,
  useGetCoachJoinRequests, useApproveJoinRequest, useRejectJoinRequest,
  type CoachJoinRequestItem,
} from "@workspace/api-client-react";
import { ModeBadge, cn } from "@/components/ui/mode-badge";
import { Loader2, Search, UserPlus, CheckCircle, Copy, Check, UserCheck, X, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ClientsOverview() {
  const { data: clients, isLoading } = useGetClients({ query: { queryKey: ["/api/coach/clients"], refetchInterval: 30000 } });
  const { data: inviteData } = useGetInviteCode();
  const { data: joinRequests, isLoading: requestsLoading } = useGetCoachJoinRequests();
  const linkMutation = useCoachLink();
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const myCode = inviteData?.inviteCode ?? null;

  const handleCopyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast({ title: "Copié !", description: "Code d'invitation copié dans le presse-papier." });
  };

  const handleLink = async () => {
    setLinkError("");
    setLinkSuccess("");
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      setLinkError("Entrez les 6 caractères du code d'invitation de l'athlète.");
      return;
    }
    try {
      const res = await linkMutation.mutateAsync({ data: { inviteCode: code } });
      setLinkSuccess(res.message ?? "Athlète lié avec succès !");
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/coach/clients"] });
    } catch (err: unknown) {
      const serverMsg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      setLinkError(serverMsg || "Code invalide ou athlète introuvable.");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setLinkDialogOpen(open);
    if (!open) {
      setInviteCode("");
      setLinkError("");
      setLinkSuccess("");
    }
  };

  const handleApprove = async (requestId: string, name: string) => {
    await approveMutation.mutateAsync(requestId);
    toast({ title: "Demande acceptée", description: `${name} a été ajouté(e) à votre liste d'athlètes.` });
  };

  const handleReject = async (requestId: string, name: string) => {
    await rejectMutation.mutateAsync(requestId);
    toast({ title: "Demande refusée", description: `La demande de ${name} a été refusée.`, variant: "destructive" });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  let filteredClients = clients || [];

  if (filter === "active") {
    filteredClients = filteredClients.filter(c => c.todayCheckin != null);
  } else if (filter === "alerts") {
    filteredClients = filteredClients.filter(c => c.activeAlerts > 0);
  }

  if (search) {
    const s = search.toLowerCase();
    filteredClients = filteredClients.filter(c =>
      c.firstName.toLowerCase().includes(s) ||
      (c.lastName && c.lastName.toLowerCase().includes(s)) ||
      c.email.toLowerCase().includes(s)
    );
  }

  const pendingRequests = joinRequests ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Invite code banner — always visible at top */}
      {myCode && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl bg-primary/10 border border-primary/30">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Votre code d'invitation</p>
            <p className="text-sm text-muted-foreground">Partagez ce code avec vos athlètes pour qu'ils puissent rejoindre votre espace coaching.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-6 py-3 rounded-lg bg-background border border-primary/40 font-mono text-3xl font-bold text-primary tracking-[0.3em] select-all">
              {myCode}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              className="border-primary/30 hover:bg-primary/20 text-primary h-12 w-12"
              title="Copier le code"
            >
              {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Pending join requests */}
      {pendingRequests.length > 0 && (
        <div className="rounded-xl bg-card border border-amber-500/30 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-mono uppercase tracking-wider text-amber-400">
              Demandes d'accès ({pendingRequests.length})
            </span>
          </div>
          <div className="divide-y divide-border/50">
            {pendingRequests.map((req: CoachJoinRequestItem) => (
              <div key={req.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                  {req.athleteFirstName[0]}{req.athleteLastName?.[0] ?? ""}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{req.athleteFirstName} {req.athleteLastName}</div>
                  <div className="text-xs text-muted-foreground truncate">{req.athleteEmail}</div>
                  {(req.athleteFitnessLevel || req.athletePrimaryGoal) && (
                    <div className="flex gap-2 mt-1">
                      {req.athleteFitnessLevel && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                          {req.athleteFitnessLevel}
                        </span>
                      )}
                      {req.athletePrimaryGoal && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {req.athletePrimaryGoal}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(req.id, req.athleteFirstName)}
                    disabled={approveMutation.isPending}
                    className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary h-8"
                    variant="outline"
                  >
                    {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3 mr-1" />}
                    Accepter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReject(req.id, req.athleteFirstName)}
                    disabled={rejectMutation.isPending}
                    className="h-8"
                    variant="ghost"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-white">ATHLÈTES</h1>
          <p className="text-muted-foreground text-sm">Gestion des profils, alertes et check-ins quotidiens.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un athlète..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[250px] bg-card border-border"
            />
          </div>
          <Button
            onClick={() => setLinkDialogOpen(true)}
            className="flex items-center gap-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary"
            variant="outline"
          >
            <UserPlus className="w-4 h-4" />
            Lier par code
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="border-b border-border p-4 bg-background/50">
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="bg-background/50 border border-border">
              <TabsTrigger value="all">Tous les athlètes</TabsTrigger>
              <TabsTrigger value="active">Actifs aujourd'hui</TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:text-destructive">Avec alertes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase font-mono bg-background/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Athlète</th>
                <th className="px-6 py-4 font-semibold">ADAPT Score</th>
                <th className="px-6 py-4 font-semibold">Mode de séance</th>
                <th className="px-6 py-4 font-semibold">Statut check-in</th>
                <th className="px-6 py-4 font-semibold text-right">Alertes actives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredClients.map((client) => {
                const hasCheckin = !!client.todayCheckin;
                const score = client.todayCheckin?.adaptScore || 0;
                const alerts = client.activeAlerts;

                let rowState = "default";
                if (alerts > 0) rowState = "danger";
                else if (!hasCheckin || score < 40) rowState = "warning";
                else if (hasCheckin && score >= 60) rowState = "good";

                const stateStyles = {
                  danger: "border-l-[3px] border-l-destructive bg-destructive/5 hover:bg-destructive/10",
                  warning: "border-l-[3px] border-l-accent bg-accent/5 hover:bg-accent/10",
                  good: "border-l-[3px] border-l-primary bg-primary/5 hover:bg-primary/10",
                  default: "border-l-[3px] border-l-transparent hover:bg-white/5",
                };

                return (
                  <tr key={client.id} className={cn("transition-colors group", stateStyles[rowState as keyof typeof stateStyles])}>
                    <td className="px-6 py-4">
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-3 outline-none">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white group-hover:bg-white/20 transition-colors overflow-hidden flex-shrink-0">
                          {client.avatarUrl ? (
                            <img src={client.avatarUrl} alt={client.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <>{client.firstName[0]}{client.lastName?.[0]}</>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-primary transition-colors">
                            {client.firstName} {client.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{client.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {hasCheckin ? (
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xl font-display",
                            score >= 60 ? "text-primary" : score >= 40 ? "text-secondary" : "text-accent"
                          )}>
                            {score}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">/100</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {client.todayCheckin?.sessionMode ? (
                        <ModeBadge mode={client.todayCheckin.sessionMode} />
                      ) : (
                        <span className="text-muted-foreground italic text-xs">En attente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasCheckin ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          Soumis
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                          Manqué
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {alerts > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-white font-bold text-xs">
                          {alerts}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Aucun athlète trouvé selon les critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-white font-display text-xl">LIER UN ATHLÈTE</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Entrez le code d'invitation à 6 caractères de votre athlète pour le connecter à votre compte coach.
            </DialogDescription>
          </DialogHeader>

          {linkSuccess ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-10 h-10 text-primary" />
              <p className="text-white font-medium text-center">{linkSuccess}</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <Input
                placeholder="ABC123"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-background border-border text-white font-mono text-center text-xl tracking-widest uppercase"
              />
              {linkError && (
                <p className="text-destructive text-sm text-center">{linkError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            {linkSuccess ? (
              <Button onClick={() => handleDialogClose(false)} className="w-full">
                Fermer
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleDialogClose(false)} className="border-border">
                  Annuler
                </Button>
                <Button
                  onClick={handleLink}
                  disabled={linkMutation.isPending || inviteCode.length !== 6}
                  className="bg-primary hover:bg-primary/90"
                >
                  {linkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Connecter l'athlète
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
