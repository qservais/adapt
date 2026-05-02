import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function useSearchParam(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const token = useSearchParam("token");
  const [autoOpenAttempted, setAutoOpenAttempted] = useState(false);

  const deepLink = useMemo(
    () => (token ? `athlete-app://auth/reset-password?token=${token}` : ""),
    [token],
  );

  useEffect(() => {
    if (!deepLink || autoOpenAttempted) return;
    setAutoOpenAttempted(true);
    const t = window.setTimeout(() => {
      window.location.href = deepLink;
    }, 250);
    return () => window.clearTimeout(t);
  }, [deepLink, autoOpenAttempted]);

  if (!token) {
    return (
      <div style={shell}>
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <LanguageSwitcher />
        </div>
        <div style={card}>
          <h1 style={titleStyle}>{t("reset.invalidTitle")}</h1>
          <p style={subtitle}>{t("reset.invalidMessage")}</p>
          <Link
            href="/"
            style={{ ...primaryBtn, textDecoration: "none", display: "inline-block" }}
          >
            {t("reset.back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <LanguageSwitcher />
      </div>
      <div style={card}>
        <p style={kicker}>{t("reset.brand")}</p>
        <h1 style={titleStyle} dangerouslySetInnerHTML={{ __html: t("reset.title").replace(" ", "<br/>") }} />
        <p
          style={subtitle}
          dangerouslySetInnerHTML={{ __html: t("reset.instructions") }}
        />

        <a href={deepLink} style={primaryBtn}>{t("reset.openApp")}</a>

        <div style={divider} />

        <p style={footerNote}>{t("reset.noApp")}</p>
        <Link
          href="/"
          style={{
            ...secondaryLink,
            textDecoration: "none",
            display: "inline-block",
            marginTop: 16,
          }}
        >
          {t("reset.back")}
        </Link>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0A0A0A",
  padding: 24,
  position: "relative",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "rgba(20, 20, 20, 0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: "40px 28px",
  textAlign: "center" as const,
  backdropFilter: "blur(12px)",
  boxShadow: "0 0 40px rgba(0, 245, 160, 0.08)",
};

const kicker: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.3em",
  color: "#00F5A0",
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 36,
  letterSpacing: "0.08em",
  color: "#FFFFFF",
  lineHeight: 1.05,
  margin: "0 0 20px",
};

const subtitle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  lineHeight: 1.55,
  color: "#9CA3AF",
  margin: "0 0 28px",
};

const primaryBtn: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 13,
  letterSpacing: "0.15em",
  background: "#00F5A0",
  color: "#000",
  fontWeight: 700,
  padding: "16px 24px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  width: "100%",
  boxSizing: "border-box" as const,
};

const divider: React.CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.08)",
  margin: "28px 0 20px",
};

const footerNote: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: "#6B7280",
  margin: 0,
};

const secondaryLink: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 12,
  letterSpacing: "0.1em",
  color: "#00F5A0",
};
