import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0A" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", color: "#00F5A0" }}>404</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#888", marginTop: "0.5rem" }}>{t("notFound.message")}</p>
        <Link href="/" style={{ display: "inline-block", marginTop: "1.5rem", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", color: "#00F5A0", textDecoration: "none" }}>{t("notFound.back")}</Link>
      </div>
    </div>
  );
}
