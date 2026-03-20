import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Dumbbell, Bell, MessageSquare, LogOut, Loader2 } from "lucide-react";
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
    { title: "Tableau de bord", url: "/clients", icon: LayoutDashboard },
    { title: "Athlètes", url: "/clients", icon: Users },
    { title: "Programmes", url: "/programs", icon: Dumbbell },
    { 
      title: "Alertes", 
      url: "/alerts", 
      icon: Bell,
      badge: unresolvedAlertsCount > 0 ? unresolvedAlertsCount : null
    },
    { 
      title: "Messages", 
      url: "/messages", 
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
  ];

  return (
    <Sidebar variant="inset" className="border-r border-border bg-card">
      <SidebarContent>
        <div className="p-6">
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
                    isActive={location === item.url || (item.url !== '/' && location.startsWith(item.url))}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border-r-2 data-[active=true]:border-primary transition-all duration-200"
                  >
                    <Link href={item.url} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      {item.badge !== null && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
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
