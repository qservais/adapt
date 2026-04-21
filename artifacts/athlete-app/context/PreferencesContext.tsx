import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "./AuthContext";
import { DARK_COLORS, LIGHT_COLORS } from "@/constants/theme";

type Language = "fr" | "en";
type Theme = "dark" | "light" | "system";
type Units = "metric" | "imperial";

interface Preferences {
  language: Language;
  theme: Theme;
  units: Units;
}

interface PreferencesContextValue extends Preferences {
  resolvedTheme: "dark" | "light";
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setUnits: (units: Units) => void;
  persist: (partial: Partial<Preferences>) => Promise<void>;
  formatWeight: (kg: number | null | undefined) => string;
  formatDistance: (km: number | null | undefined) => string;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  language: "fr",
  theme: "dark",
  units: "metric",
  resolvedTheme: "dark",
  setLanguage: () => {},
  setTheme: () => {},
  setUnits: () => {},
  persist: async () => {},
  formatWeight: (kg) => (kg != null ? `${kg} kg` : "—"),
  formatDistance: (km) => (km != null ? `${km} km` : "—"),
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const systemColorScheme = useColorScheme();
  const [language, setLanguageState] = useState<Language>("fr");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [units, setUnitsState] = useState<Units>("metric");

  const resolvedTheme: "dark" | "light" =
    theme === "system"
      ? (systemColorScheme === "light" ? "light" : "dark")
      : theme;

  useEffect(() => {
    if (!isAuthenticated) return;
    customFetch<{ language?: string; theme?: string; units?: string }>(
      "/api/users/me/profile"
    )
      .then((data) => {
        if (data.language === "en") setLanguageState("en");
        else setLanguageState("fr");
        if (data.theme === "light") setThemeState("light");
        else if (data.theme === "system") setThemeState("system");
        else setThemeState("dark");
        if (data.units === "imperial") setUnitsState("imperial");
        else setUnitsState("metric");
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const persist = useCallback(async (partial: Partial<Preferences>) => {
    await customFetch("/api/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(partial),
    });
  }, []);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      persist({ language: lang }).catch(() => {});
    },
    [persist]
  );

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      persist({ theme: t }).catch(() => {});
    },
    [persist]
  );

  const setUnits = useCallback(
    (u: Units) => {
      setUnitsState(u);
      persist({ units: u }).catch(() => {});
    },
    [persist]
  );

  const formatWeight = useCallback(
    (kg: number | null | undefined): string => {
      if (kg == null) return "—";
      if (units === "imperial") {
        return `${(kg * 2.20462).toFixed(1)} lbs`;
      }
      return `${kg} kg`;
    },
    [units]
  );

  const formatDistance = useCallback(
    (km: number | null | undefined): string => {
      if (km == null) return "—";
      if (units === "imperial") {
        return `${(km * 0.621371).toFixed(2)} mi`;
      }
      return `${km} km`;
    },
    [units]
  );

  return (
    <PreferencesContext.Provider
      value={{
        language,
        theme,
        units,
        resolvedTheme,
        setLanguage,
        setTheme,
        setUnits,
        persist,
        formatWeight,
        formatDistance,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function useResolvedTheme(): "dark" | "light" {
  return useContext(PreferencesContext).resolvedTheme;
}

export function useFormatWeight() {
  return useContext(PreferencesContext).formatWeight;
}

export function useFormatDistance() {
  return useContext(PreferencesContext).formatDistance;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    kg: "kg", km: "km", lbs: "lbs", mi: "mi",
    weight: "Poids", height: "Taille",
    primary_goal: "Objectif principal", secondary_goal: "Objectif secondaire",
    fitness_level: "Niveau de forme",
    training_context: "Contexte d'entraînement",
    available_days: "Jours d'entraînement",
    training_location: "Lieu d'entraînement",
    equipment: "Équipement disponible",
    session_duration: "Durée de séance",
    session_min: "Minimum", session_max: "Maximum",
    injuries: "Blessures / Restrictions permanentes",
    no_restrictions: "Aucune restriction renseignée",
    exercises: "Exercices", avoided_exercises: "Exercices à éviter",
    favorite_exercises: "Exercices préférés",
    add_exercise: "Ajouter un exercice...",
    from_library: "Depuis la bibliothèque",
    select_exercises: "Sélectionner des exercices",
    done: "Terminer", none: "Aucun",
    preferences: "Préférences",
    language_label: "Langue", theme_label: "Thème", units_label: "Unités",
    health_apps: "Applications santé",
    sync_health_data: "Synchronise tes données de santé avec ADAPT.",
    privacy: "Confidentialité",
    privacy_desc: "Contrôle ce que ton coach peut voir de ton profil.",
    share_weight: "Partager le poids",
    share_sleep: "Partager le sommeil",
    share_heart_rate: "Partager la fréquence cardiaque",
    share_body_fat: "Partager la masse grasse",
    share_context: "Partager le contexte d'entraînement",
    coach_only: "Profil visible par le coach uniquement",
    profile_private: "Profil entièrement privé",
    notifications: "Notifications",
    silent_mode: "Désactiver toutes les notifications",
    morning_notif: "Notification check-in matin",
    session_reminder: "Rappel de séance",
    progress_update: "Mise à jour de progression",
    coach_messages: "Messages du coach",
    save: "Enregistrer", cancel: "Annuler", edit: "Modifier",
    connect: "Connecter", disconnect: "Déconnecter",
    connected: "Connecté", not_connected: "Non connecté",
    achievement: "Succès débloqué",
    weekly_recap: "Récapitulatif hebdo",
    soon: "Bientôt disponible",
    soon_msg: "sera disponible dans une prochaine mise à jour.",
    privacy_visibility: "Visibilité du profil",
    shared_data: "Données partagées avec le coach",
    completion_hint_low: "Complète ton profil pour personnaliser ton entraînement",
    completion_hint_mid: "Quelques informations manquent encore",
    no_injury: "Aucune restriction renseignée",
    units_metric: "Kg / Km",
    units_imperial: "Lbs / Mi",
    lang_fr: "Français",
    lang_en: "English",
    theme_dark: "Sombre",
    theme_light: "Clair",
    theme_system: "Automatique",
  },
  en: {
    kg: "kg", km: "km", lbs: "lbs", mi: "mi",
    weight: "Weight", height: "Height",
    primary_goal: "Primary goal", secondary_goal: "Secondary goal",
    fitness_level: "Fitness level",
    training_context: "Training context",
    available_days: "Training days",
    training_location: "Training location",
    equipment: "Available equipment",
    session_duration: "Session duration",
    session_min: "Minimum", session_max: "Maximum",
    injuries: "Injuries / Permanent restrictions",
    no_restrictions: "No restrictions provided",
    exercises: "Exercises", avoided_exercises: "Exercises to avoid",
    favorite_exercises: "Favorite exercises",
    add_exercise: "Add an exercise...",
    from_library: "From library",
    select_exercises: "Select exercises",
    done: "Done", none: "None",
    preferences: "Preferences",
    language_label: "Language", theme_label: "Theme", units_label: "Units",
    health_apps: "Health apps",
    sync_health_data: "Sync your health data with ADAPT.",
    privacy: "Privacy",
    privacy_desc: "Control what your coach can see from your profile.",
    share_weight: "Share weight",
    share_sleep: "Share sleep",
    share_heart_rate: "Share heart rate",
    share_body_fat: "Share body fat",
    share_context: "Share training context",
    coach_only: "Coach-only profile",
    profile_private: "Fully private profile",
    notifications: "Notifications",
    silent_mode: "Disable all notifications",
    morning_notif: "Morning check-in notification",
    session_reminder: "Session reminder",
    progress_update: "Progress update",
    coach_messages: "Coach messages",
    save: "Save", cancel: "Cancel", edit: "Edit",
    connect: "Connect", disconnect: "Disconnect",
    connected: "Connected", not_connected: "Not connected",
    achievement: "Achievement unlocked",
    weekly_recap: "Weekly summary",
    soon: "Coming soon",
    soon_msg: "will be available in a future update.",
    privacy_visibility: "Profile visibility",
    shared_data: "Data shared with coach",
    completion_hint_low: "Complete your profile to personalize your training",
    completion_hint_mid: "Some information is still missing",
    no_injury: "No restrictions noted",
    units_metric: "Kg / Km",
    units_imperial: "Lbs / Mi",
    lang_fr: "Français",
    lang_en: "English",
    theme_dark: "Dark",
    theme_light: "Light",
    theme_system: "Auto",
  },
};

export function useT() {
  const { language } = usePreferences();
  return useCallback(
    (key: string, fallback?: string): string => {
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.fr;
      return dict[key] ?? fallback ?? key;
    },
    [language]
  );
}

export function useUnitsLabel() {
  const { units } = usePreferences();
  return {
    weight: units === "imperial" ? "lbs" : "kg",
    distance: units === "imperial" ? "mi" : "km",
    isImperial: units === "imperial",
  };
}

export function useThemeColors() {
  const { resolvedTheme } = usePreferences();
  return resolvedTheme === "light" ? LIGHT_COLORS : DARK_COLORS;
}
