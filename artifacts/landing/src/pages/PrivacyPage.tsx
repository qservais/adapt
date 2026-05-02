import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = (t("privacy.sections", { returnObjects: true }) as Array<{ title: string; content: string }>) ?? [];
  const year = new Date().getFullYear();

  return (
    <div style={{ background: "#0A0A0A", color: "#F0F0F0", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: "1px solid #1E1E1E",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(10px)",
        padding: "0 2rem",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", height: "64px", gap: "1.5rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#00F5A0" }}>ADAPT</span>
          </Link>
          <span style={{ color: "#333" }}>→</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#888", letterSpacing: "0.08em" }}>{t("privacy.navLabel")}</span>
          <div style={{ marginLeft: "auto" }}>
            <LanguageSwitcher compact />
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 2rem" }}>
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#00F5A0", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>
            {t("privacy.kicker")}
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "0.02em", marginBottom: "1rem" }}>
            {t("privacy.title1")}<br />
            <span style={{ color: "#00F5A0" }}>{t("privacy.title2")}</span>
          </h1>
          <p style={{ color: "#888", lineHeight: 1.7 }}>
            {t("privacy.intro")}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {sections.map((section) => (
            <div key={section.title} style={{ borderTop: "1px solid #1E1E1E", paddingTop: "2rem" }}>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.35rem", letterSpacing: "0.05em", color: "#F0F0F0", marginBottom: "1rem" }}>
                {section.title}
              </h2>
              <div style={{ color: "#888", lineHeight: 1.8, fontSize: "0.9rem", whiteSpace: "pre-line" }}>
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "4rem", borderTop: "1px solid #1E1E1E", paddingTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <Link href="/" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#00F5A0", textDecoration: "none", letterSpacing: "0.08em" }}>
            {t("privacy.back")}
          </Link>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#555" }}>
            {t("privacy.copyright", { year })}
          </p>
        </div>
      </main>
    </div>
  );
}
