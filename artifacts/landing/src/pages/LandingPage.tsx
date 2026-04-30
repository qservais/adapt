import { useState, useEffect, useRef } from "react";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Pour qui", href: "#for-who" },
  { label: "Comment ça marche", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Programmes adaptatifs",
    description: "Chaque séance est recalculée en fonction de ton état du jour. Fatigue, récupération, progression — tout est pris en compte automatiquement.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Check-in quotidien",
    description: "30 secondes le matin pour renseigner ton niveau d'énergie, ton sommeil et ta motivation. L'algorithme ajuste ta séance en conséquence.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Tableau de bord coach",
    description: "Vue complète sur tous tes athlètes : alertes, progression, check-ins, records personnels. Tout ce qu'il faut pour coacher sans friction.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Suivi des records",
    description: "Records personnels automatiquement détectés et archivés. Graphiques de progression, historique complet, badges de performance.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Messagerie intégrée",
    description: "Communication directe entre coach et athlète dans l'application. Pas besoin de jongler entre WhatsApp, Instagram et les notes vocales.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Challenges & badges",
    description: "Défis hebdomadaires, badges de progression, classements internes. La motivation par la compétition saine et la reconnaissance.",
  },
];

const HOW_IT_WORKS_COACH = [
  { step: "01", title: "Crée ton compte coach", desc: "Inscription rapide, tableau de bord immédiatement disponible." },
  { step: "02", title: "Configure tes programmes", desc: "Blocs d'exercices, intensités, jours — tout est paramétrable à la séance." },
  { step: "03", title: "Invite tes athlètes", desc: "Un code unique par athlète. Ils téléchargent l'app et s'y connectent." },
  { step: "04", title: "Supervise en temps réel", desc: "Alertes automatiques, vue d'ensemble, ajustements à la volée." },
];

const HOW_IT_WORKS_ATHLETE = [
  { step: "01", title: "Télécharge ADAPT", desc: "Disponible sur iOS et Android. Inscription avec le code de ton coach." },
  { step: "02", title: "Check-in chaque matin", desc: "30 secondes pour renseigner ton état. L'app adapte ta séance." },
  { step: "03", title: "Lance ta séance", desc: "Instructions claires, minuteries intégrées, suivi des charges." },
  { step: "04", title: "Progresse, batte des records", desc: "Tes performances sont tracées. Chaque PR est célébré." },
];

const STATS = [
  { number: "100%", label: "Adaptatif" },
  { number: "30s", label: "Check-in quotidien" },
  { number: "∞", label: "Athlètes suivis" },
];

function PhoneMockup() {
  return (
    <div className="phone-mockup w-[260px] mx-auto animate-float" style={{ animationDuration: "7s" }}>
      <div className="phone-screen">
        <div className="screen-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.25rem", letterSpacing: "0.1em", color: "#00F5A0" }}>ADAPT</span>
            <span className="pill">ACTIF</span>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", letterSpacing: "0.05em" }}>Mercredi · Séance du jour</p>
        </div>
        <div style={{ padding: "1rem 1.25rem", background: "#111" }}>
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Check-in</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["😴", "💪", "🔥"].map((emoji, i) => (
                <div key={i} style={{
                  flex: 1, background: i === 2 ? "rgba(0,245,160,0.15)" : "#0A0A0A",
                  border: i === 2 ? "1px solid rgba(0,245,160,0.4)" : "1px solid #1E1E1E",
                  padding: "0.5rem", textAlign: "center", borderRadius: "4px", fontSize: "1rem"
                }}>
                  {emoji}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", padding: "0.75rem", marginBottom: "0.75rem" }}>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.05em", color: "#F0F0F0", marginBottom: "0.5rem" }}>FORCE UPPER A</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              {[
                { label: "Exercices", value: "6" },
                { label: "Durée", value: "52min" },
                { label: "Volume", value: "~4t" },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", color: "#00F5A0" }}>{s.value}</p>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "#888", letterSpacing: "0.05em" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{
              background: "#00F5A0", color: "#0A0A0A", fontFamily: "'Space Mono', monospace",
              fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
              padding: "0.4rem", textAlign: "center"
            }}>COMMENCER →</div>
          </div>
          {[
            { name: "Développé couché", sets: "4×6 @ 85kg", done: true },
            { name: "Rowing barre", sets: "4×8 @ 70kg", done: false },
            { name: "Développé incliné", sets: "3×10 @ 65kg", done: false },
          ].map((ex, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.4rem 0", borderBottom: "1px solid #1E1E1E"
            }}>
              <div style={{
                width: "16px", height: "16px", border: `1px solid ${ex.done ? "#00F5A0" : "#333"}`,
                borderRadius: "2px", flexShrink: 0,
                background: ex.done ? "rgba(0,245,160,0.2)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {ex.done && <span style={{ color: "#00F5A0", fontSize: "0.5rem" }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.6rem", color: ex.done ? "#888" : "#F0F0F0" }}>{ex.name}</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#888" }}>{ex.sets}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div style={{
      background: "#111", border: "1px solid #1E1E1E", padding: "1.25rem",
      width: "100%", maxWidth: "460px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>TABLEAU DE BORD</p>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.25rem", letterSpacing: "0.05em", color: "#F0F0F0" }}>COACH MARTIN</p>
        </div>
        <span className="pill">8 athlètes</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Actifs aujourd'hui", value: "6", color: "#00F5A0" },
          { label: "Check-ins reçus", value: "6/8", color: "#00D9FF" },
          { label: "Alertes", value: "1", color: "#FF6B6B" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1E1E1E", padding: "0.75rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", color: s.color }}>{s.value}</p>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#888", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "0.25rem" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Athlètes</p>
      {[
        { name: "Sophie D.", checkin: "🔥 Énergie haute", pr: "PR squat +5kg", status: "ok" },
        { name: "Lucas B.", checkin: "😴 Fatigue élevée", pr: null, status: "alert" },
        { name: "Emma V.", checkin: "💪 Prêt", pr: null, status: "ok" },
        { name: "Thomas K.", checkin: "— En attente", pr: null, status: "pending" },
      ].map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.6rem 0", borderBottom: "1px solid #1E1E1E"
        }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
            background: a.status === "ok" ? "#00F5A0" : a.status === "alert" ? "#FF6B6B" : "#888"
          }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "#F0F0F0", fontWeight: 500 }}>{a.name}</p>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "#888" }}>{a.checkin}</p>
          </div>
          {a.pr && (
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#00F5A0",
              background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.2)",
              padding: "0.15rem 0.4rem"
            }}>{a.pr}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<"coach" | "athlete">("coach");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#0A0A0A", color: "#F0F0F0", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrolled ? "1px solid #1E1E1E" : "1px solid transparent",
        background: scrolled ? "rgba(10,10,10,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        transition: "all 0.3s ease",
        padding: "0 2rem",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <a href="#" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#00F5A0" }}>ADAPT</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#888", marginLeft: "0.5rem", letterSpacing: "0.08em" }}>BY LMJ</span>
          </a>
          <div className="hide-mobile" style={{ display: "flex", gap: "2rem" }}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
            ))}
          </div>
          <a href="https://app.adapt-system.be" className="btn-neon" style={{ padding: "0.5rem 1.25rem", fontSize: "0.7rem" }}>
            ACCÈS COACH →
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-grid" style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "6rem 2rem 4rem", textAlign: "center", position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,245,160,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto" }}>
          <div className="section-tag" style={{ marginBottom: "1.5rem" }}>// Coaching sportif intelligent</div>

          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(4rem, 14vw, 10rem)",
            lineHeight: 0.9,
            letterSpacing: "0.02em",
            marginBottom: "1.5rem",
          }}>
            <span style={{ display: "block", color: "#F0F0F0" }}>ENTRAÎNE</span>
            <span style={{ display: "block", color: "#00F5A0", textShadow: "0 0 30px rgba(0,245,160,0.4)" }}>ADAPTE.</span>
            <span style={{ display: "block", color: "#F0F0F0" }}>PERFORME.</span>
          </h1>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "#888",
            maxWidth: "560px",
            margin: "0 auto 2.5rem",
            lineHeight: 1.6,
          }}>
            La plateforme qui connecte coachs et athlètes. Programmes intelligents, check-ins quotidiens, suivi en temps réel — tout au même endroit.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
            <a href="#" className="btn-neon">TÉLÉCHARGER L'APP</a>
            <a href="https://app.adapt-system.be" className="btn-outline">ESPACE COACH</a>
          </div>

          <div style={{ display: "flex", gap: "3rem", justifyContent: "center", flexWrap: "wrap" }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p className="stat-number">{s.number}</p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "0.25rem" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)" }}>
          <div className="scroll-indicator" />
        </div>
      </section>

      {/* PHONE MOCKUP */}
      <section style={{ padding: "4rem 2rem 6rem", background: "#0A0A0A" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            <div>
              <div className="section-tag">// Application mobile</div>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1, marginBottom: "1.5rem", letterSpacing: "0.02em" }}>
                TON COACH<br />
                <span style={{ color: "#00F5A0" }}>DANS TA POCHE</span>
              </h2>
              <p style={{ color: "#888", lineHeight: 1.7, marginBottom: "2rem", maxWidth: "420px" }}>
                L'application ADAPT pour athlètes centralise tout : check-in matinal, séance du jour adaptée à ton état, suivi des charges, historique complet et messagerie avec ton coach.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                {["Check-in en 30 secondes", "Séance adaptée automatiquement", "Suivi des charges en temps réel", "Détection automatique des PRs"].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "20px", height: "20px", background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#00F5A0", fontSize: "0.65rem" }}>✓</span>
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", color: "#C0C0C0" }}>{item}</span>
                  </div>
                ))}
              </div>
              <a href="#" className="btn-neon">TÉLÉCHARGER GRATUITEMENT →</a>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      <div className="divider" style={{ margin: "0 2rem" }} />

      {/* FEATURES */}
      <section id="features" style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="section-tag">// Fonctionnalités</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1, letterSpacing: "0.02em" }}>
              TOUT CE DONT TU AS<br />
              <span style={{ color: "#00F5A0" }}>BESOIN POUR COACHER</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1px", background: "#1E1E1E" }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card-dark" style={{
                padding: "2rem", background: "#0A0A0A",
                transition: "background 0.2s",
                cursor: "default",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#0A0A0A")}
              >
                <div className="feature-icon">{f.icon}</div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.35rem", letterSpacing: "0.05em", marginBottom: "0.75rem", color: "#F0F0F0" }}>{f.title}</h3>
                <p style={{ color: "#888", lineHeight: 1.65, fontSize: "0.9rem" }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR WHO */}
      <section id="for-who" style={{ padding: "6rem 2rem", background: "#0A0A0A" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="section-tag">// Pour qui</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1, letterSpacing: "0.02em" }}>
              DEUX INTERFACES,<br />
              <span style={{ color: "#00F5A0" }}>UN ÉCOSYSTÈME</span>
            </h2>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "3rem" }}>
            <button
              onClick={() => setActiveTab("coach")}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", letterSpacing: "0.1em",
                padding: "0.75rem 2rem", border: "none", cursor: "pointer",
                background: activeTab === "coach" ? "#00F5A0" : "transparent",
                color: activeTab === "coach" ? "#0A0A0A" : "#888",
                borderBottom: activeTab === "coach" ? "none" : "1px solid #1E1E1E",
                transition: "all 0.2s",
              }}
            >COACH</button>
            <button
              onClick={() => setActiveTab("athlete")}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", letterSpacing: "0.1em",
                padding: "0.75rem 2rem", border: "none", cursor: "pointer",
                background: activeTab === "athlete" ? "#00F5A0" : "transparent",
                color: activeTab === "athlete" ? "#0A0A0A" : "#888",
                borderBottom: activeTab === "athlete" ? "none" : "1px solid #1E1E1E",
                transition: "all 0.2s",
              }}
            >ATHLÈTE</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            <div>
              {activeTab === "coach" ? (
                <>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", marginBottom: "1.25rem", letterSpacing: "0.02em" }}>
                    POUR LES <span style={{ color: "#00F5A0" }}>COACHS</span>
                  </h3>
                  <p style={{ color: "#888", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                    Centralise la gestion de tous tes athlètes dans un seul tableau de bord. Crée des programmes sur mesure, reçois les check-ins chaque matin, et sois alerté en temps réel dès qu'un athlète a besoin d'attention.
                  </p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {["Tableau de bord multi-athlètes", "Création de programmes par blocs", "Alertes automatiques de fatigue", "Bibliothèque d'exercices complète", "Messagerie directe par athlète", "Gestion des rendez-vous"].map((item) => (
                      <li key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                        <span style={{ color: "#00F5A0", marginTop: "0.1rem", flexShrink: 0 }}>→</span>
                        <span style={{ color: "#C0C0C0", fontSize: "0.9rem" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", marginBottom: "1.25rem", letterSpacing: "0.02em" }}>
                    POUR LES <span style={{ color: "#00D9FF" }}>ATHLÈTES</span>
                  </h3>
                  <p style={{ color: "#888", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                    Stop aux programmes génériques. ADAPT ajuste chaque séance selon ton état du jour. Tu es fatigué ? L'intensité baisse. Tu es à bloc ? On pousse les charges. Ton coach est toujours dans la boucle.
                  </p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {["Séance adaptée chaque matin", "Check-in rapide (30 secondes)", "Suivi des charges en séance", "Records personnels automatiques", "Messagerie avec ton coach", "Badges et défis hebdomadaires"].map((item) => (
                      <li key={item} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                        <span style={{ color: "#00D9FF", marginTop: "0.1rem", flexShrink: 0 }}>→</span>
                        <span style={{ color: "#C0C0C0", fontSize: "0.9rem" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {activeTab === "coach" ? <DashboardMockup /> : (
                <div style={{ transform: "scale(1.1)" }}>
                  <PhoneMockup />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="divider" style={{ margin: "0 2rem" }} />

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="section-tag">// Comment ça marche</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1, letterSpacing: "0.02em" }}>
              EN 4 ÉTAPES,<br />
              <span style={{ color: "#00F5A0" }}>TU ES OPÉRATIONNEL</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem" }}>
            <div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#00F5A0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>// Pour les coachs</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {HOW_IT_WORKS_COACH.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: "1.25rem" }}>
                    <div style={{
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "rgba(0,245,160,0.2)",
                      letterSpacing: "0.05em", lineHeight: 1, flexShrink: 0, width: "2.5rem",
                    }}>{step.step}</div>
                    <div>
                      <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", fontWeight: 600, color: "#F0F0F0", marginBottom: "0.25rem" }}>{step.title}</h4>
                      <p style={{ color: "#888", fontSize: "0.875rem", lineHeight: 1.6 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#00D9FF", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>// Pour les athlètes</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {HOW_IT_WORKS_ATHLETE.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: "1.25rem" }}>
                    <div style={{
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "rgba(0,217,255,0.2)",
                      letterSpacing: "0.05em", lineHeight: 1, flexShrink: 0, width: "2.5rem",
                    }}>{step.step}</div>
                    <div>
                      <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", fontWeight: 600, color: "#F0F0F0", marginBottom: "0.25rem" }}>{step.title}</h4>
                      <p style={{ color: "#888", fontSize: "0.875rem", lineHeight: 1.6 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{
        background: "linear-gradient(135deg, rgba(0,245,160,0.08) 0%, rgba(0,217,255,0.04) 100%)",
        border: "1px solid rgba(0,245,160,0.15)",
        margin: "0 2rem 4rem",
        padding: "4rem 2rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div className="section-tag" style={{ marginBottom: "1rem" }}>// Rejoindre ADAPT</div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 0.95, letterSpacing: "0.02em", marginBottom: "1.5rem" }}>
            PRÊT À COACHER<br />
            <span style={{ color: "#00F5A0" }}>DIFFÉREMMENT ?</span>
          </h2>
          <p style={{ color: "#888", lineHeight: 1.7, marginBottom: "2.5rem", fontSize: "1rem" }}>
            Que tu sois coach cherchant à structurer ton activité, ou athlète voulant progresser avec méthode — ADAPT est fait pour toi.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://app.adapt-system.be" className="btn-neon">CRÉER MON COMPTE COACH →</a>
            <a href="#" className="btn-outline">TÉLÉCHARGER L'APP ATHLÈTE</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{ borderTop: "1px solid #1E1E1E", padding: "3rem 2rem 2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.75rem", letterSpacing: "0.1em", color: "#00F5A0" }}>ADAPT</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#888", marginLeft: "0.5rem", letterSpacing: "0.08em" }}>BY LMJ</span>
              </div>
              <p style={{ color: "#888", fontSize: "0.875rem", lineHeight: 1.7, maxWidth: "280px", marginBottom: "1.25rem" }}>
                Plateforme de coaching sportif intelligent. Connecte coachs et athlètes pour des performances optimales.
              </p>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#555" }}>adapt-system.be</p>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>Plateforme</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {["App athlète", "Dashboard coach", "Fonctionnalités", "Comment ça marche"].map((item) => (
                  <a key={item} href="#" style={{ color: "#888", textDecoration: "none", fontSize: "0.875rem", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#888")}
                  >{item}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>Légal</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { label: "Politique de confidentialité", href: "/landing/privacy" },
                  { label: "CGU", href: "#" },
                  { label: "Mentions légales", href: "#" },
                ].map((item) => (
                  <a key={item.label} href={item.href} style={{ color: "#888", textDecoration: "none", fontSize: "0.875rem", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#888")}
                  >{item.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#00F5A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>Contact</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <a href="mailto:hello@adapt-system.be" style={{ color: "#888", textDecoration: "none", fontSize: "0.875rem", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#888")}
                >hello@adapt-system.be</a>
                <a href="https://instagram.com/adapt.lmj" style={{ color: "#888", textDecoration: "none", fontSize: "0.875rem", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#888")}
                >@adapt.lmj</a>
              </div>
            </div>
          </div>

          <div className="divider" style={{ marginBottom: "1.5rem" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#555", letterSpacing: "0.05em" }}>
              © 2026 ADAPT by LMJ. Tous droits réservés.
            </p>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#333", letterSpacing: "0.05em" }}>
              Fait avec 🔥 en Belgique
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
