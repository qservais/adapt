import { Link } from "wouter";

const SECTIONS = [
  {
    title: "1. Responsable du traitement",
    content: `ADAPT by LMJ est responsable du traitement de vos données personnelles collectées via l'application mobile ADAPT et le site adapt-system.be.

Contact : hello@adapt-system.be`,
  },
  {
    title: "2. Données collectées",
    content: `Nous collectons les données suivantes :

— Informations de compte : nom, prénom, adresse e-mail, mot de passe (chiffré)
— Données de profil : poids, taille, objectifs, date de naissance
— Données d'entraînement : check-ins quotidiens (énergie, sommeil, motivation), séances réalisées, charges utilisées, records personnels
— Données de communication : messages échangés avec votre coach via l'application
— Données techniques : identifiant de l'appareil, adresse IP, logs de connexion`,
  },
  {
    title: "3. Finalités du traitement",
    content: `Vos données sont utilisées pour :

— Fournir et personnaliser le service de coaching sportif
— Adapter les programmes d'entraînement à votre état quotidien
— Permettre la communication entre coachs et athlètes
— Envoyer des notifications liées à votre programme
— Assurer la sécurité et le bon fonctionnement de l'application
— Respecter nos obligations légales`,
  },
  {
    title: "4. Base légale",
    content: `Le traitement de vos données repose sur :

— L'exécution du contrat (fourniture du service ADAPT)
— Votre consentement explicite pour les données sensibles (données de santé et de performance)
— Nos intérêts légitimes pour l'amélioration du service
— Le respect de nos obligations légales`,
  },
  {
    title: "5. Partage des données",
    content: `Vos données sont partagées avec :

— Votre coach ADAPT : données de check-in, performances, messages
— Nos sous-traitants techniques (hébergement, envoi d'e-mails) sous contrat de confidentialité
— Les autorités compétentes en cas d'obligation légale

Nous ne vendons jamais vos données à des tiers.`,
  },
  {
    title: "6. Conservation des données",
    content: `Vos données sont conservées :

— Données de compte et de profil : pendant la durée de votre inscription + 2 ans
— Données d'entraînement : pendant la durée de votre inscription
— Données de messagerie : pendant la durée de votre inscription
— Logs techniques : 12 mois maximum

En cas de suppression de compte, vos données sont effacées sous 30 jours, sauf obligation légale de conservation.`,
  },
  {
    title: "7. Vos droits",
    content: `Conformément au RGPD, vous disposez des droits suivants :

— Droit d'accès : obtenir une copie de vos données
— Droit de rectification : corriger vos données inexactes
— Droit à l'effacement : demander la suppression de vos données
— Droit à la portabilité : recevoir vos données dans un format structuré
— Droit d'opposition : vous opposer à certains traitements
— Droit à la limitation : restreindre l'utilisation de vos données

Pour exercer ces droits, contactez-nous à : hello@adapt-system.be

Vous pouvez également introduire une réclamation auprès de l'Autorité de Protection des Données (APD) : www.autoriteprotectiondonnees.be`,
  },
  {
    title: "8. Sécurité",
    content: `Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :

— Chiffrement des mots de passe (bcrypt)
— Communications chiffrées (HTTPS/TLS)
— Accès aux données restreint aux personnes autorisées
— Sauvegardes régulières`,
  },
  {
    title: "9. Cookies",
    content: `L'application mobile ADAPT n'utilise pas de cookies. Le site web adapt-system.be peut utiliser des cookies techniques nécessaires au bon fonctionnement du site. Aucun cookie publicitaire ou de tracking n'est utilisé.`,
  },
  {
    title: "10. Modifications",
    content: `Cette politique de confidentialité peut être mise à jour. En cas de modification substantielle, vous serez notifié par e-mail ou via l'application. La date de dernière mise à jour est indiquée ci-dessous.

Dernière mise à jour : 30 avril 2026`,
  },
];

export default function PrivacyPage() {
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
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#888", letterSpacing: "0.08em" }}>Politique de confidentialité</span>
        </div>
      </nav>

      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 2rem" }}>
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#00F5A0", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>
            // Légal
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "0.02em", marginBottom: "1rem" }}>
            POLITIQUE DE<br />
            <span style={{ color: "#00F5A0" }}>CONFIDENTIALITÉ</span>
          </h1>
          <p style={{ color: "#888", lineHeight: 1.7 }}>
            La présente politique de confidentialité décrit comment ADAPT by LMJ collecte, utilise et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la législation belge applicable.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {SECTIONS.map((section) => (
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
            ← Retour à l'accueil
          </Link>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#555" }}>
            © 2026 ADAPT by LMJ
          </p>
        </div>
      </main>
    </div>
  );
}
