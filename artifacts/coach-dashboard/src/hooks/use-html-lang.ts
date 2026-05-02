import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useHtmlLang() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const lang = i18n.resolvedLanguage ?? i18n.language ?? "fr";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
    }
  }, [i18n.resolvedLanguage, i18n.language]);
}
