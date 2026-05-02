import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

function useSearchParam(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export default function ResetPasswordPage() {
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
        <div style={card}>
          <h1 style={titleStyle}>LIEN INVALIDE</h1>
          <p style={subtitle}>
            Ce lien de réinitialisation est invalide ou a expiré. Demande un nouveau lien depuis l'app ADAPT.
          </p>
          <Link
            href="/"
            style={{
              ...primaryBtn,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <p style={kicker}>ADAPT</p>
        <h1 style={titleStyle}>RÉINITIALISER<br />MON MOT DE PASSE</h1>
        <p style={subtitle}>
          Ce lien doit être ouvert dans l'app <strong style={{ color: "#00F5A0" }}>ADAPT</strong> sur ton téléphone. Si l'app ne s'est pas ouverte automatiquement, appuie sur le bouton ci-dessous.
        </p>

        <a href={deepLink} style={primaryBtn}>OUVRIR DANS L'APP ADAPT</a>

        <div style={divider} />

        <p style={footerNote}>
          Tu n'as pas encore l'app ADAPT installée ? Demande-la à ton coach.
        </p>
        <Link
          href="/"
          style={{
            ...secondaryLink,
            textDecoration: "none",
            display: "inline-block",
            marginTop: 16,
          }}
        >
          ← Retour à l'accueil
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
