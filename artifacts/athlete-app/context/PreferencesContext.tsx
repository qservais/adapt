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
    kg: "kg",
    km: "km",
    lbs: "lbs",
    mi: "mi",
    weight: "Poids",
    height: "Taille",
    primary_goal: "Objectif principal",
    secondary_goal: "Objectif secondaire",
    fitness_level: "Niveau de forme",
    training_context: "Contexte d'entraînement",
    available_days: "Jours disponibles",
    training_location: "Lieu d'entraînement",
    equipment: "Équipement",
    session_duration: "Durée de séance",
    injuries: "Blessures / restrictions",
    preferences: "Préférences",
    language_label: "Langue",
    theme_label: "Thème",
    units_label: "Unités",
    health_apps: "Applications santé",
    privacy: "Confidentialité",
    notifications: "Notifications",
    save: "Enregistrer",
    cancel: "Annuler",
    edit: "Modifier",
    connect: "Connecter",
    disconnect: "Déconnecter",
    connected: "Connecté",
    not_connected: "Non connecté",
  },
  en: {
    kg: "kg",
    km: "km",
    lbs: "lbs",
    mi: "mi",
    weight: "Weight",
    height: "Height",
    primary_goal: "Primary goal",
    secondary_goal: "Secondary goal",
    fitness_level: "Fitness level",
    training_context: "Training context",
    available_days: "Available days",
    training_location: "Training location",
    equipment: "Equipment",
    session_duration: "Session duration",
    injuries: "Injuries / restrictions",
    preferences: "Preferences",
    language_label: "Language",
    theme_label: "Theme",
    units_label: "Units",
    health_apps: "Health apps",
    privacy: "Privacy",
    notifications: "Notifications",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    connect: "Connect",
    disconnect: "Disconnect",
    connected: "Connected",
    not_connected: "Not connected",
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
