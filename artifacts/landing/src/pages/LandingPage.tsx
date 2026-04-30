import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useFadeIn } from "@/hooks/use-fade-in";

function FadeSection({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <section
      id={id}
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        transition: "opacity 0.6s ease, transform 0.6s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function AppStoreBadge() {
  return (
    <a href="#" aria-label="Télécharger sur l'App Store" style={{ display: "inline-block", transition: "opacity 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
    >
      <svg width="156" height="52" viewBox="0 0 156 52" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Download on the App Store">
        <rect x="0.5" y="0.5" width="155" height="51" rx="7.5" fill="#0A0A0A" stroke="#00F5A0"/>
        <path d="M18.5 16.5C17.7 16.5 16.9 16.8 16.3 17.4C15.7 18 15.3 18.8 15.3 19.7C15.3 21.3 16.4 22.7 17.9 23C17.5 23.5 17.1 24.3 17.1 25.2C17.1 26.9 18.2 28.2 19.6 28.2C20.2 28.2 20.8 27.9 21.2 27.5V35H22.5V17.8C21.5 17 20 16.5 18.5 16.5ZM18.5 21.9C17.8 21.9 17.3 21.3 17.3 20.4C17.3 19.5 17.9 18.8 18.7 18.8C19.2 18.8 19.6 19.1 19.9 19.5C19.7 20.9 19.2 21.9 18.5 21.9Z" fill="#00F5A0"/>
        <text x="31" y="24" font-family="Arial, sans-serif" font-size="9" fill="#888888" letter-spacing="0.5">TÉLÉCHARGER SUR</text>
        <text x="31" y="38" font-family="Arial Black, sans-serif" font-weight="900" font-size="16" fill="#F0F0F0">App Store</text>
      </svg>
    </a>
  );
}

function PhoneScreenCheckin() {
  return (
    <div style={{
      background: "linear-gradient(145deg, #1a1a1a, #0d0d0d)",
      border: "1px solid #2a2a2a",
      borderRadius: "2.5rem",
      padding: "0.875rem",
      boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,245,160,0.05)",
      width: "220px",
      flexShrink: 0,
    }}>
      <div style={{ background: "#111", borderRadius: "2rem", overflow: "hidden" }}>
        <div style={{ background: "#0A0A0A", padding: "0.875rem 1rem 0.625rem", borderBottom: "1px solid #1E1E1E" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "0.1em", color: "#00F5A0" }}>ADAPT</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#00F5A0", background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.2)", padding: "0.15rem 0.5rem" }}>ACTIF</span>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#888", letterSpacing: "0.05em" }}>Mercredi · Check-in</p>
        </div>
        <div style={{ padding: "0.875rem 1rem", background: "#111" }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Comment tu te sens ?</p>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.875rem" }}>
            {[{ e: "😴", l: "Fatigué" }, { e: "💪", l: "OK" }, { e: "🔥", l: "À bloc" }].map((item, i) => (
              <div key={i} style={{
                flex: 1, background: i === 2 ? "rgba(0,245,160,0.15)" : "#0A0A0A",
                border: i === 2 ? "1px solid rgba(0,245,160,0.4)" : "1px solid #1E1E1E",
                padding: "0.5rem 0.25rem", textAlign: "center", borderRadius: "4px"
              }}>
                <div style={{ fontSize: "1.1rem", marginBottom: "0.125rem" }}>{item.e}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: i === 2 ? "#00F5A0" : "#888" }}>{item.l}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Séance du jour</p>
          <div style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", padding: "0.625rem", marginBottom: "0.5rem" }}>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.875rem", letterSpacing: "0.05em", color: "#F0F0F0", marginBottom: "0.375rem" }}>FORCE UPPER A</p>
            <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.5rem" }}>
              {[{ v: "6", l: "Exercices" }, { v: "52min", l: "Durée" }, { v: "~4t", l: "Volume" }].map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.875rem", color: "#00F5A0" }}>{s.v}</p>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "#888" }}>{s.l}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "#00F5A0", color: "#0A0A0A", fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, padding: "0.3rem", textAlign: "center" }}>COMMENCER →</div>
          </div>
          {[
            { name: "Développé couché", sets: "4×6 @ 85kg", done: true },
            { name: "Rowing barre", sets: "4×8 @ 70kg", done: false },
          ].map((ex, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0", borderBottom: "1px solid #1E1E1E" }}>
              <div style={{ width: "14px", height: "14px", border: `1px solid ${ex.done ? "#00F5A0" : "#333"}`, borderRadius: "2px", flexShrink: 0, background: ex.done ? "rgba(0,245,160,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ex.done && <span style={{ color: "#00F5A0", fontSize: "0.45rem" }}>✓</span>}
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.55rem", color: ex.done ? "#888" : "#F0F0F0" }}>{ex.name}</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "#888" }}>{ex.sets}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneScreenDashboard() {
  return (
    <div style={{
      background: "linear-gradient(145deg, #1a1a1a, #0d0d0d)",
      border: "1px solid #2a2a2a",
      borderRadius: "2.5rem",
      padding: "0.875rem",
      boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,217,255,0.05)",
      width: "220px",
      flexShrink: 0,
    }}>
      <div style={{ background: "#111", borderRadius: "2rem", overflow: "hidden" }}>
        <div style={{ background: "#0A0A0A", padding: "0.875rem 1rem 0.625rem", borderBottom: "1px solid #1E1E1E" }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#888", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>TABLEAU DE BORD</p>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "0.1em", color: "#F0F0F0" }}>COACH MARTIN</p>
        </div>
        <div style={{ padding: "0.875rem 1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.375rem", marginBottom: "0.875rem" }}>
            {[
              { v: "6", l: "Actifs", c: "#00F5A0" },
              { v: "6/8", l: "Check-ins", c: "#00D9FF" },
              { v: "1", l: "Alertes", c: "#FF6B6B" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", padding: "0.5rem 0.25rem", textAlign: "center" }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", color: s.c }}>{s.v}</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "#888", textTransform: "uppercase", marginTop: "0.125rem" }}>{s.l}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.375rem" }}>Athlètes</p>
          {[
            { name: "Sophie D.", checkin: "🔥 Énergie haute", pr: "PR +5kg", ok: true },
            { name: "Lucas B.", checkin: "😴 Fatigue", pr: null, ok: false },
            { name: "Emma V.", checkin: "💪 Prêt", pr: null, ok: true },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0", borderBottom: "1px solid #1E1E1E" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: a.ok ? "#00F5A0" : "#FF6B6B" }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.55rem", color: "#F0F0F0", fontWeight: 500 }}>{a.name}</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "#888" }}>{a.checkin}</p>
              </div>
              {a.pr && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "#00F5A0", background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.2)", padding: "0.1rem 0.3rem" }}>{a.pr}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneScreenPR() {
  return (
    <div style={{
      background: "linear-gradient(145deg, #1a1a1a, #0d0d0d)",
      border: "1px solid #2a2a2a",
      borderRadius: "2.5rem",
      padding: "0.875rem",
      boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,245,160,0.03)",
      width: "220px",
      flexShrink: 0,
    }}>
      <div style={{ background: "#111", borderRadius: "2rem", overflow: "hidden" }}>
        <div style={{ background: "#0A0A0A", padding: "0.875rem 1rem 0.625rem", borderBottom: "1px solid #1E1E1E" }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#888", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>PROGRESSIONS</p>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "0.05em", color: "#F0F0F0" }}>RECORDS PERSO</p>
        </div>
        <div style={{ padding: "0.875rem 1rem" }}>
          <div style={{ background: "rgba(0,245,160,0.05)", border: "1px solid rgba(0,245,160,0.2)", padding: "0.75rem", marginBottom: "0.75rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#00F5A0", letterSpacing: "0.1em", marginBottom: "0.375rem" }}>🏆 NOUVEAU PR !</p>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", color: "#00F5A0" }}>102.5 KG</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.6rem", color: "#888", marginTop: "0.25rem" }}>Squat · +2.5kg vs précédent</p>
          </div>
          {[
            { name: "Squat", value: "102.5kg", trend: "+2.5" },
            { name: "Développé couché", value: "87.5kg", trend: "+5" },
            { name: "Soulevé de terre", value: "140kg", trend: "+10" },
            { name: "Rowing barre", value: "75kg", trend: "+2.5" },
          ].map((pr, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid #1E1E1E" }}>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.55rem", color: "#F0F0F0" }}>{pr.name}</p>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.875rem", color: "#00F5A0" }}>{pr.value}</p>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "#00F5A0" }}>+{pr.trend}kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Score ADAPT quotidien",
    description: "Chaque matin, tu renseignes ton énergie, ton sommeil et ta motivation en 30 secondes. L'algorithme calcule ton score ADAPT et adapte ta séance en conséquence.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Programmes personnalisés",
    description: "Ton coach crée des programmes sur mesure : blocs d'exercices, intensités, jours de repos. Chaque séance est recalculée selon ton état du jour.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Suivi en temps réel avec coach",
    description: "Ton coach voit tes check-ins, tes performances et tes records dès qu'ils arrivent. Alertes automatiques, messagerie intégrée — la distance n'existe plus.",
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#0A0A0A", color: "#F0F0F0", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrolled ? "1px solid #1E1E1E" : "1px solid transparent",
        background: scrolled ? "rgba(10,10,10,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        transition: "all 0.3s ease",
        padding: "0 clamp(1rem, 4vw, 2rem)",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <a href="#" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#00F5A0" }}>ADAPT</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#555", letterSpacing: "0.08em" }}>BY LMJ</span>
          </a>
          <div style={{ display: "flex", gap: "clamp(1rem, 3vw, 2.5rem)", alignItems: "center" }}>
            {[
              { label: "Fonctionnalités", href: "#features" },
              { label: "Pour qui", href: "#for-who" },
              { label: "Screenshots", href: "#screenshots" },
            ].map((l) => (
              <a key={l.label} href={l.href} style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.08em",
                color: "#888", textDecoration: "none", transition: "color 0.2s",
                display: "none",
              }}
                className="nav-link-desktop"
                onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")}
                onMouseLeave={e => (e.currentTarget.style.color = "#888")}
              >{l.label}</a>
            ))}
            <a href="https://app.adapt-system.be" style={{
              background: "#00F5A0", color: "#0A0A0A", fontFamily: "'Space Mono', monospace",
              fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.05em",
              padding: "0.5rem 1.25rem", textDecoration: "none", transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#00ffaa"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0,245,160,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#00F5A0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >ACCÈS COACH →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "7rem clamp(1rem, 4vw, 2rem) 5rem",
        textAlign: "center", position: "relative",
        backgroundImage: "linear-gradient(rgba(0,245,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,160,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,245,160,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#00F5A0", marginBottom: "1.5rem" }}>
            // Coaching sportif intelligent
          </div>

          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(4.5rem, 15vw, 11rem)",
            lineHeight: 0.9,
            letterSpacing: "0.02em",
            marginBottom: "1.5rem",
          }}>
            <span style={{ display: "block", color: "#F0F0F0" }}>ADAPT</span>
          </h1>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            color: "#C0C0C0",
            maxWidth: "520px",
            margin: "0 auto 0.75rem",
            lineHeight: 1.5,
          }}>
            L'entraînement qui s'adapte à toi.
          </p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
            color: "#888",
            maxWidth: "480px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.65,
          }}>
            La plateforme qui connecte coachs et athlètes. Programmes personnalisés, check-in en 30 secondes, suivi en temps réel.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
            <AppStoreBadge />
            <a href="https://app.adapt-system.be" style={{
              background: "transparent", color: "#888", fontFamily: "'Space Mono', monospace",
              fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em",
              padding: "0 1.5rem", border: "1px solid #1E1E1E", textDecoration: "none",
              display: "flex", alignItems: "center", height: "52px",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#00F5A0"; (e.currentTarget as HTMLElement).style.color = "#00F5A0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1E1E1E"; (e.currentTarget as HTMLElement).style.color = "#888"; }}
            >ESPACE COACH →</a>
          </div>

          <div style={{ display: "flex", gap: "clamp(1.5rem, 5vw, 4rem)", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { number: "100%", label: "Adaptatif" },
              { number: "30s", label: "Check-in quotidien" },
              { number: "iOS", label: "Disponible sur" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1, color: "#00F5A0" }}>{s.number}</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "0.25rem" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ width: "1px", height: "50px", background: "linear-gradient(to bottom, #00F5A0, transparent)", margin: "0 auto", animation: "pulse 2s ease-in-out infinite" }} />
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </section>

      {/* FEATURES — Ce que fait ADAPT */}
      <FadeSection id="features" style={{ padding: "6rem clamp(1rem, 4vw, 2rem)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#00F5A0", marginBottom: "0.875rem" }}>// Ce que fait ADAPT</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1, letterSpacing: "0.02em" }}>
              TROIS PILIERS,<br />
              <span style={{ color: "#00F5A0" }}>UN SYSTÈME COHÉRENT</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "#1E1E1E" }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: "2rem", background: "#0A0A0A",
                transition: "background 0.2s",
              }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#0f0f0f")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#0A0A0A")}
              >
                <div style={{
                  width: "44px", height: "44px", border: "1px solid rgba(0,245,160,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#00F5A0", marginBottom: "1.25rem",
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", letterSpacing: "0.05em", marginBottom: "0.75rem", color: "#F0F0F0" }}>{f.title}</h3>
                <p style={{ color: "#888", lineHeight: 1.65, fontSize: "0.875rem" }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* FOR WHO */}
      <FadeSection id="for-who" style={{ padding: "6rem clamp(1rem, 4vw, 2rem)", borderTop: "1px solid #1E1E1E" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#00F5A0", marginBottom: "0.875rem" }}>// Pour qui ?</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1, letterSpacing: "0.02em" }}>
              DEUX PROFILS,<br />
              <span style={{ color: "#00F5A0" }}>UN ÉCOSYSTÈME</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1px", background: "#1E1E1E" }}>
            {[
              {
                label: "ATHLÈTES",
                color: "#00F5A0",
                desc: "Stop aux programmes génériques. ADAPT ajuste chaque séance selon ton état du jour. Fatigue élevée ? L'intensité s'adapte. Tu es à fond ? On pousse les charges.",
                items: [
                  "Séance adaptée chaque matin",
                  "Check-in rapide (30 secondes)",
                  "Suivi des charges en séance",
                  "Records personnels automatiques",
                  "Messagerie avec ton coach",
                  "Badges et défis hebdomadaires",
                ],
              },
              {
                label: "COACHS",
                color: "#00D9FF",
                desc: "Centralise la gestion de tous tes athlètes dans un tableau de bord unique. Crée des programmes sur mesure, reçois les check-ins, et sois alerté en temps réel.",
                items: [
                  "Tableau de bord multi-athlètes",
                  "Création de programmes par blocs",
                  "Alertes automatiques de fatigue",
                  "Bibliothèque d'exercices complète",
                  "Messagerie directe par athlète",
                  "Gestion des rendez-vous",
                ],
              },
            ].map((p, i) => (
              <div key={i} style={{ padding: "2.5rem", background: "#0A0A0A" }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: p.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>// {p.label}</p>
                <p style={{ color: "#888", lineHeight: 1.7, fontSize: "0.9rem", marginBottom: "1.5rem" }}>{p.desc}</p>
                <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {p.items.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <span style={{ color: p.color, marginTop: "0.1rem", flexShrink: 0, fontSize: "0.75rem" }}>→</span>
                      <span style={{ color: "#C0C0C0", fontSize: "0.875rem" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* SCREENSHOTS */}
      <FadeSection id="screenshots" style={{ padding: "6rem clamp(1rem, 4vw, 2rem)", borderTop: "1px solid #1E1E1E" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#00F5A0", marginBottom: "0.875rem" }}>// L'app en images</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1, letterSpacing: "0.02em" }}>
              TROIS ÉCRANS,<br />
              <span style={{ color: "#00F5A0" }}>TOUTE LA PUISSANCE</span>
            </h2>
          </div>

          <div style={{ display: "flex", gap: "clamp(1.5rem, 4vw, 3rem)", justifyContent: "center", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ textAlign: "center" }}>
              <PhoneScreenCheckin />
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "1.25rem" }}>Check-in & séance du jour</p>
            </div>
            <div style={{ textAlign: "center", transform: "translateY(-1.5rem)" }}>
              <PhoneScreenDashboard />
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "1.25rem" }}>Tableau de bord coach</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <PhoneScreenPR />
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "1.25rem" }}>Records personnels</p>
            </div>
          </div>
        </div>
      </FadeSection>

      {/* CTA BAND */}
      <section style={{
        borderTop: "1px solid rgba(0,245,160,0.15)",
        borderBottom: "1px solid rgba(0,245,160,0.15)",
        background: "linear-gradient(135deg, rgba(0,245,160,0.06) 0%, rgba(0,217,255,0.03) 100%)",
        padding: "5rem clamp(1rem, 4vw, 2rem)",
        textAlign: "center",
        margin: "0",
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#00F5A0", marginBottom: "1rem" }}>// Rejoindre ADAPT</div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 0.95, letterSpacing: "0.02em", marginBottom: "1.5rem" }}>
            PRÊT À PROGRESSER<br />
            <span style={{ color: "#00F5A0" }}>DIFFÉREMMENT ?</span>
          </h2>
          <p style={{ color: "#888", lineHeight: 1.7, marginBottom: "2.5rem", fontSize: "0.95rem" }}>
            Athlète ou coach, ADAPT s'adapte à toi. Télécharge l'app ou crée ton compte coach gratuitement.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <AppStoreBadge />
            <a href="https://app.adapt-system.be" style={{
              background: "transparent", color: "#888", fontFamily: "'Space Mono', monospace",
              fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em",
              padding: "0 1.5rem", border: "1px solid #1E1E1E", textDecoration: "none",
              display: "flex", alignItems: "center", height: "52px",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#00F5A0"; (e.currentTarget as HTMLElement).style.color = "#00F5A0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1E1E1E"; (e.currentTarget as HTMLElement).style.color = "#888"; }}
            >CRÉER COMPTE COACH →</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #1E1E1E", padding: "2rem clamp(1rem, 4vw, 2rem)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#555", letterSpacing: "0.05em" }}>
            © 2025 ADAPT System · <a href="mailto:hello@adapt-system.be" style={{ color: "#555", textDecoration: "none" }}>hello@adapt-system.be</a>
          </p>
              <Link href="/privacy" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#555", textDecoration: "none", letterSpacing: "0.05em", transition: "color 0.2s" }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => ((e.currentTarget as HTMLElement).style.color = "#888")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => ((e.currentTarget as HTMLElement).style.color = "#555")}
          >Mentions légales</Link>
        </div>
      </footer>
    </div>
  );
}
