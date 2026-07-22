import { useTranslation } from "react-i18next";
import { UserCircle2 } from "lucide-react";
import { SettingsSections } from "@/pages/settings/index";
import { ComptaCard } from "@/components/compta-card";

/**
 * "Profil" — one of the 4 top-level nav destinations in the client-validated
 * mockup. Hosts everything that used to live at /settings (avatar, name,
 * language, web push, logout) plus the new ComptaCard (VAT regime toggle,
 * invoice history, CSV export).
 */
export default function ProfilePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-display text-white flex items-center gap-3">
          <UserCircle2 className="w-8 h-8 text-primary" /> {t("profile_page.title", { defaultValue: "PROFIL" })}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("profile_page.subtitle", { defaultValue: "Compte, préférences et facturation." })}
        </p>
      </div>

      <SettingsSections />
      <ComptaCard />
    </div>
  );
}
