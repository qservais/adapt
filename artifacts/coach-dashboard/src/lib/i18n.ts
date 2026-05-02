import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const LANGUAGE_STORAGE_KEY = "adapt_lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: "fr",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

export function setLanguage(lang: SupportedLanguage) {
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {}
}

export function getCurrentLanguage(): SupportedLanguage {
  const lng = i18n.resolvedLanguage ?? i18n.language ?? "fr";
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng)
    ? (lng as SupportedLanguage)
    : "fr";
}

export default i18n;
