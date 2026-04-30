export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0A" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", color: "#00F5A0" }}>404</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#888", marginTop: "0.5rem" }}>Page introuvable</p>
        <a href="/" style={{ display: "inline-block", marginTop: "1.5rem", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", color: "#00F5A0", textDecoration: "none" }}>← Retour à l'accueil</a>
      </div>
    </div>
  );
}
