import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Dumbbell, Library, BookCopy, Bell, MessageSquare, LogOut, Trophy, BellRing, Settings, CalendarRange, ShoppingBag, UsersRound, Handshake } from "lucide-react";
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
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  
  const { data: alerts } = useGetAlerts({ query: { queryKey: ['/api/coach/alerts'], refetchInterval: 30000 }});
  const { data: threads } = useGetMessageThreads({ query: { queryKey: ['/api/messages/threads'], refetchInterval: 10000 }});

  const unresolvedAlertsCount = alerts?.filter(a => !a.isResolved).length || 0;
  const unreadMessagesCount = threads?.reduce((acc, t) => acc + t.unreadCount, 0) || 0;

  const items = [
    {
      title: t("sidebar.item_dashboard_title"),
      subtitle: t("sidebar.item_dashboard_subtitle"),
      url: "/",
      icon: LayoutDashboard,
      exactMatch: true,
    },
    {
      title: t("sidebar.item_athletes_title"),
      subtitle: t("sidebar.item_athletes_subtitle"),
      url: "/clients",
      icon: Users,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_agenda_title"),
      subtitle: t("sidebar.item_agenda_subtitle"),
      url: "/agenda",
      icon: CalendarRange,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_classes_title"),
      subtitle: t("sidebar.item_classes_subtitle"),
      url: "/classes",
      icon: UsersRound,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_one_on_one_title"),
      subtitle: t("sidebar.item_one_on_one_subtitle"),
      url: "/one-on-one",
      icon: Handshake,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_shop_title"),
      subtitle: t("sidebar.item_shop_subtitle"),
      url: "/shop",
      icon: ShoppingBag,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_programs_title"),
      subtitle: t("sidebar.item_programs_subtitle"),
      url: "/programs",
      icon: Dumbbell,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_library_title"),
      subtitle: t("sidebar.item_library_subtitle"),
      url: "/library",
      icon: Library,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_content_title"),
      subtitle: t("sidebar.item_content_subtitle"),
      url: "/content",
      icon: BookCopy,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_challenges_title"),
      subtitle: t("sidebar.item_challenges_subtitle"),
      url: "/challenges",
      icon: Trophy,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_notifications_title"),
      subtitle: t("sidebar.item_notifications_subtitle"),
      url: "/notifications",
      icon: BellRing,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_alerts_title"),
      subtitle: t("sidebar.item_alerts_subtitle"),
      url: "/alerts",
      icon: Bell,
      badge: unresolvedAlertsCount > 0 ? unresolvedAlertsCount : null,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_messages_title"),
      subtitle: t("sidebar.item_messages_subtitle"),
      url: "/messages",
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_settings_title"),
      subtitle: t("sidebar.item_settings_subtitle"),
      url: "/settings",
      icon: Settings,
      badge: null,
      exactMatch: false,
    },
  ];

  const isActive = (item: typeof items[0]) => {
    if (item.exactMatch) return location === item.url;
    return location === item.url || (item.url !== "/" && location.startsWith(item.url));
  };

  return (
    <Sidebar variant="inset" className="border-r border-border bg-card">
      <SidebarContent className="overflow-y-auto">
        <div className="p-4 lg:p-6 pb-3">
          <h1 className="text-2xl lg:text-3xl font-display text-white tracking-widest text-shadow-neon-primary">
            {t("sidebar.app_title")} <span className="text-primary">{t("sidebar.app_role")}</span>
          </h1>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase font-mono tracking-widest text-xs mb-2">{t("sidebar.group_main")}</SidebarGroupLabel>
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                        <div className="flex flex-col gap-0 min-w-0">
                          <span className="font-medium text-sm leading-tight truncate">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight font-normal truncate">{item.subtitle}</span>
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
      <SidebarFooter className="p-3 lg:p-4 border-t border-border">
        <div className="flex items-center gap-2.5 mb-3 px-1.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-display shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <>{user?.firstName?.[0]}{user?.lastName?.[0] || ''}</>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground font-mono truncate">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-2 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t("sidebar.logout")}</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
