import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Dumbbell, Bell, MessageSquare, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { useGetAlerts, useGetMessageThreads } from "@workspace/api-client-react";

export function AppSidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  
  const { data: alerts } = useGetAlerts({ query: { queryKey: ['/api/coach/alerts'], refetchInterval: 30000 }});
  const { data: threads } = useGetMessageThreads({ query: { queryKey: ['/api/messages/threads'], refetchInterval: 10000 }});

  const unresolvedAlertsCount = alerts?.filter(a => !a.isResolved).length || 0;
  const unreadMessagesCount = threads?.reduce((acc, t) => acc + t.unreadCount, 0) || 0;

  const items = [
    {
      title: "Tableau de bord",
      subtitle: "Vue opérationnelle du jour",
      url: "/",
      icon: LayoutDashboard,
      exactMatch: true,
    },
    {
      title: "Athlètes",
      subtitle: "Profils, alertes et check-ins",
      url: "/clients",
      icon: Users,
      exactMatch: false,
    },
    {
      title: "Programmes",
      subtitle: "Plans d'entraînement",
      url: "/programs",
      icon: Dumbbell,
      exactMatch: false,
    },
    {
      title: "Alertes",
      subtitle: "Signaux à traiter",
      url: "/alerts",
      icon: Bell,
      badge: unresolvedAlertsCount > 0 ? unresolvedAlertsCount : null,
      exactMatch: false,
    },
    {
      title: "Messages",
      subtitle: "Échanges avec les athlètes",
      url: "/messages",
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      exactMatch: false,
    },
  ];

  const isActive = (item: typeof items[0]) => {
    if (item.exactMatch) return location === item.url;
    return location === item.url || (item.url !== "/" && location.startsWith(item.url));
  };

  return (
    <Sidebar variant="inset" className="border-r border-border bg-card">
      <SidebarContent>
        <div className="p-6 pb-4">
          <h1 className="text-3xl font-display text-white tracking-widest text-shadow-neon-primary">
            ADAPT <span className="text-primary">COACH</span>
          </h1>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase font-mono tracking-widest text-xs mb-2">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item)}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border-r-2 data-[active=true]:border-primary transition-all duration-200 h-auto py-2.5"
                  >
                    <Link href={item.url} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 shrink-0" />
                        <div className="flex flex-col gap-0">
                          <span className="font-medium text-sm leading-tight">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight font-normal">{item.subtitle}</span>
                        </div>
                      </div>
                      {item.badge !== null && item.badge !== undefined && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ml-2 shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-display">
            {user?.firstName?.[0]}{user?.lastName?.[0] || ''}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground font-mono">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-2 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
