import { useTranslation } from "react-i18next";
import { setLanguage, type SupportedLanguage } from "@/lib/i18n";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "fr") as SupportedLanguage;

  const handle = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        border: "1px solid #1E1E1E",
        borderRadius: 4,
        overflow: "hidden",
        marginRight: compact ? 8 : 12,
      }}
    >
      {(["fr", "en"] as const).map((lang) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handle(lang)}
            aria-pressed={active}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              fontWeight: 700,
              padding: compact ? "0.3rem 0.55rem" : "0.4rem 0.7rem",
              background: active ? "#00F5A0" : "transparent",
              color: active ? "#0A0A0A" : "#888",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "#F0F0F0";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "#888";
            }}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
