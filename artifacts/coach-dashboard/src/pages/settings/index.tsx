import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";
import { setLanguage, type SupportedLanguage } from "@/lib/i18n";
import { Loader2, Settings, Camera, User, Mail, Save, LogOut, Languages, Bell, BellOff } from "lucide-react";
import { useWebPush } from "@/hooks/useWebPush";

async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const token = localStorage.getItem("adapt_coach_access");
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await fetch("/api/users/me/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

async function updateProfile(data: { firstName: string; lastName: string }): Promise<void> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch("/api/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update failed");
}

async function updateLanguagePreference(lang: SupportedLanguage): Promise<void> {
  const token = localStorage.getItem("adapt_coach_access");
  if (!token) return;
  await fetch("/api/users/me/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ language: lang }),
  }).catch(() => {});
}

/**
 * Everything from the old standalone Settings page (avatar, profile, language,
 * web push, logout) — extracted so it can be embedded inside the new Profil
 * page without duplicating logic. The /settings route (unlinked from nav but
 * kept intact) still renders this via the default export below.
 */
export function SettingsSections() {
  const { t } = useTranslation();
  const { user, refetchUser, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.firstName, user?.lastName]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      if (refetchUser) await refetchUser();
      toast({ title: t("settings.avatar.uploadSuccess") });
    } catch {
      toast({ title: t("settings.avatar.uploadError"), variant: "destructive" });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfile({ firstName, lastName });
      if (refetchUser) await refetchUser();
      toast({ title: t("settings.profile.saveSuccess") });
    } catch {
      toast({ title: t("settings.profile.saveError"), variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    updateLanguagePreference(lang).catch(() => {});
    toast({ title: t("settings.language.saved") });
  };

  function WebPushSection() {
    const { state, busy, enable, disable } = useWebPush();
    const isOn = state === "granted-on";
    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              {isOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {t("settings.webPush.section")}
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              {state === "unsupported"
                ? t("settings.webPush.unsupported")
                : state === "denied"
                ? t("settings.webPush.denied")
                : isOn
                ? t("settings.webPush.on")
                : t("settings.webPush.off")}
            </p>
          </div>
          {state !== "unsupported" && state !== "denied" && (
            <Button
              variant={isOn ? "outline" : "default"}
              className={isOn ? "border-border" : "bg-primary hover:bg-primary/90"}
              disabled={busy || state === "loading"}
              onClick={() => (isOn ? void disable() : void enable())}
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isOn ? t("settings.webPush.disable") : t("settings.webPush.enable")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const avatarSrc = avatarPreview || user?.avatarUrl || null;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  return (
    <div className="space-y-8">
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t("settings.avatar.section")}
        </h2>

        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-display text-primary">{initials}</span>
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("settings.avatar.hint")}</p>
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-white/5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              <Camera className="w-4 h-4 mr-2" />
              {t("settings.avatar.change")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t("settings.profile.section")}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> {t("settings.profile.firstName")}
            </Label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="bg-background border-border text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> {t("settings.profile.lastName")}
            </Label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="bg-background border-border text-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> {t("settings.profile.email")}
          </Label>
          <Input
            value={user?.email ?? ""}
            disabled
            className="bg-background border-border text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">{t("settings.profile.emailLocked")}</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile || (!firstName.trim())}
            className="bg-primary hover:bg-primary/90"
          >
            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t("settings.profile.save")}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Languages className="w-4 h-4" /> {t("settings.language.section")}
            </h2>
            <p className="text-xs text-muted-foreground mt-2">{t("settings.language.hint")}</p>
          </div>
        </div>
        <LanguageSwitcher onChange={handleLanguageChange} />
      </div>

      <WebPushSection />

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t("settings.session.section")}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{t("settings.session.logoutTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.session.logoutHint")}</p>
          </div>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("settings.session.logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone /settings route. Kept intact (not linked from the top-level nav
 * anymore — superseded by /profile) so nothing is deleted and the route stays
 * reachable/re-linkable later.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-display text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" /> {t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("settings.subtitle")}</p>
      </div>
      <SettingsSections />
    </div>
  );
}
