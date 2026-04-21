import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Camera, User, Mail, Save, LogOut } from "lucide-react";

async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const token = localStorage.getItem("adapt_coach_access");
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await fetch("/api/users/me/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Échec de l'upload");
  return res.json();
}

async function updateProfile(data: { firstName: string; lastName: string }): Promise<void> {
  const token = localStorage.getItem("adapt_coach_access");
  const res = await fetch("/api/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour");
}

export default function SettingsPage() {
  const { user, refetchUser, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      if (refetchUser) await refetchUser();
      toast({ title: "Photo de profil mise à jour" });
    } catch {
      toast({ title: "Échec de l'upload", variant: "destructive" });
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
      toast({ title: "Profil mis à jour" });
    } catch {
      toast({ title: "Échec de la mise à jour", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const avatarSrc = avatarPreview || user?.avatarUrl || null;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-display text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" /> PARAMÈTRES
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre profil et vos préférences.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Photo de profil</h2>

        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
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
            <p className="text-sm text-muted-foreground">
              Format JPG ou PNG. Max 5 Mo. La photo apparaîtra dans la barre latérale.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:bg-white/5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              <Camera className="w-4 h-4 mr-2" />
              Changer la photo
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
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Informations personnelles</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> Prénom
            </Label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="bg-background border-border text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> Nom
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
            <Mail className="w-3 h-3" /> Email
          </Label>
          <Input
            value={user?.email ?? ""}
            disabled
            className="bg-background border-border text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">L'email ne peut pas être modifié.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile || (!firstName.trim())}
            className="bg-primary hover:bg-primary/90"
          >
            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Session</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Se déconnecter</p>
            <p className="text-xs text-muted-foreground">Quitte la session en cours sur cet appareil.</p>
          </div>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
}
