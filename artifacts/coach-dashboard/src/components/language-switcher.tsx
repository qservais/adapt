import { useTranslation } from "react-i18next";
import { setLanguage, type SupportedLanguage } from "@/lib/i18n";

interface LanguageSwitcherProps {
  variant?: "buttons" | "select";
  onChange?: (lang: SupportedLanguage) => void;
}

export function LanguageSwitcher({ variant = "buttons", onChange }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "fr") as SupportedLanguage;

  const handle = (lang: SupportedLanguage) => {
    setLanguage(lang);
    onChange?.(lang);
  };

  if (variant === "select") {
    return (
      <select
        value={current}
        onChange={(e) => handle(e.target.value as SupportedLanguage)}
        className="bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="fr">{t("settings.language.fr")}</option>
        <option value="en">{t("settings.language.en")}</option>
      </select>
    );
  }

  return (
    <div className="flex gap-2" role="group" aria-label={t("common.language")}>
      <button
        type="button"
        onClick={() => handle("fr")}
        className={`px-4 py-2 text-sm font-mono uppercase tracking-wider border rounded-md transition-colors ${
          current === "fr"
            ? "bg-primary text-black border-primary"
            : "bg-transparent text-muted-foreground border-border hover:text-white hover:border-white/30"
        }`}
      >
        FR · Français
      </button>
      <button
        type="button"
        onClick={() => handle("en")}
        className={`px-4 py-2 text-sm font-mono uppercase tracking-wider border rounded-md transition-colors ${
          current === "en"
            ? "bg-primary text-black border-primary"
            : "bg-transparent text-muted-foreground border-border hover:text-white hover:border-white/30"
        }`}
      >
        EN · English
      </button>
    </div>
  );
}
