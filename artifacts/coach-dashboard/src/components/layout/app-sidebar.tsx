import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Users, PlusCircle, BellRing, UserCircle2, LogOut } from "lucide-react";
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

/**
 * Client-validated mockup locks the coach nav down to exactly 4 top-level
 * destinations: Athlètes / Créer / Notifs / Profil. Everything else (Tableau
 * de bord, Agenda, Cours collectifs, Rendez-vous 1:1, Boutique, Factures,
 * Bibliothèque, Contenu, Challenges, Alertes, Messages, Paramètres) is hidden
 * from nav but NOT deleted — routes/components/data are all still intact and
 * reachable by URL (some are also reachable by drilling in, e.g. Cours &
 * Boutique from the Athlètes page).
 */
export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { logout, user } = useAuth();

  const items = [
    {
      title: t("sidebar.item_athletes_title"),
      subtitle: t("sidebar.item_athletes_subtitle"),
      url: "/clients",
      icon: Users,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_create_title"),
      subtitle: t("sidebar.item_create_subtitle"),
      url: "/programs",
      icon: PlusCircle,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_notifs_title"),
      subtitle: t("sidebar.item_notifs_subtitle"),
      url: "/notifications",
      icon: BellRing,
      exactMatch: false,
    },
    {
      title: t("sidebar.item_profile_title"),
      subtitle: t("sidebar.item_profile_subtitle"),
      url: "/profile",
      icon: UserCircle2,
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
