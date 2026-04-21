import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setUnits: (units: Units) => void;
  persist: (partial: Partial<Preferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  language: "fr",
  theme: "dark",
  units: "metric",
  setLanguage: () => {},
  setTheme: () => {},
  setUnits: () => {},
  persist: async () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [language, setLanguageState] = useState<Language>("fr");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [units, setUnitsState] = useState<Units>("metric");

  useEffect(() => {
    if (!isAuthenticated) return;
    customFetch<{ language?: string; theme?: string; units?: string }>(
      "/api/users/me/profile"
    )
      .then((data) => {
        if (data.language === "en") setLanguageState("en");
        if (data.theme === "light") setThemeState("light");
        else if (data.theme === "system") setThemeState("system");
        if (data.units === "imperial") setUnitsState("imperial");
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

  return (
    <PreferencesContext.Provider
      value={{ language, theme, units, setLanguage, setTheme, setUnits, persist }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

const FR: Record<string, string> = {
  kg: "kg",
  km: "km",
  lbs: "lbs",
  mi: "mi",
};
const EN: Record<string, string> = {
  kg: "kg",
  km: "km",
  lbs: "lbs",
  mi: "mi",
};

export function useT() {
  const { language } = usePreferences();
  return useCallback(
    (key: string, fallback?: string): string => {
      const dict = language === "en" ? EN : FR;
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
