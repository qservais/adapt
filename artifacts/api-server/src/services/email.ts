import { Resend } from "resend";
import { logger } from "../lib/logger.js";

const RESEND_API_KEY = process.env["RESEND_API_KEY"];
const FROM_EMAIL = "ADAPT System <hello@adapt-system.be>";

let resend: Resend | null = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  logger.warn("RESEND_API_KEY not set — emails will be logged but not sent");
}

async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  if (!resend) {
    logger.info({ to: opts.to, subject: opts.subject }, "[EMAIL-MOCK] Would send email");
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      logger.error({ error, to: opts.to }, "Resend error");
    }
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send email via Resend");
  }
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ADAPT System</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #0A0A0A; color: #E5E5E5; font-family: 'DM Sans', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #111111; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; }
    .logo { font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #00D9FF; text-align: center; margin-bottom: 8px; }
    .logo-sub { font-size: 11px; letter-spacing: 3px; color: #666; text-align: center; margin-bottom: 32px; font-family: 'Space Mono', monospace; }
    .divider { height: 1px; background: rgba(255,255,255,0.08); margin: 28px 0; }
    h2 { font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.7; color: #B0B0B0; margin-bottom: 12px; }
    .cta { display: block; width: 100%; text-align: center; background-color: #00D9FF; color: #000000; font-weight: 700; font-size: 15px; letter-spacing: 1px; padding: 16px 24px; border-radius: 10px; text-decoration: none; margin: 28px 0; }
    .footer { text-align: center; font-size: 11px; color: #444; margin-top: 32px; line-height: 1.8; }
    .highlight { color: #00F5A0; font-weight: 600; }
    .url-fallback { word-break: break-all; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">ADAPT</div>
      <div class="logo-sub">INTELLIGENCE PERFORMANCE</div>
      <div class="divider"></div>
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ADAPT System · hello@adapt-system.be<br />
      Vous recevez cet email car vous avez un compte sur ADAPT System.
    </div>
  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  role: "athlete" | "coach",
) {
  const isCoach = role === "coach";
  const roleLabel = isCoach ? "coach" : "athlète";
  const nextStep = isCoach
    ? "Connecte-toi au tableau de bord coach pour commencer à gérer tes athlètes."
    : "Ouvre l'application ADAPT pour démarrer ton premier entraînement.";

  const html = baseTemplate(`
    <h2>Bienvenue sur ADAPT, ${firstName} !</h2>
    <p>Ton compte <span class="highlight">${roleLabel}</span> a bien été créé. Tu fais maintenant partie de la communauté ADAPT.</p>
    <p>${nextStep}</p>
    <div class="divider"></div>
    <p>Des questions ? Réponds directement à cet email — on est là.</p>
    <p style="color:#555; font-size:13px;">Ton équipe ADAPT</p>
  `);

  const text = [
    `ADAPT — INTELLIGENCE PERFORMANCE`,
    ``,
    `Bienvenue sur ADAPT, ${firstName} !`,
    ``,
    `Ton compte ${roleLabel} a bien été créé. Tu fais maintenant partie de la communauté ADAPT.`,
    ``,
    nextStep,
    ``,
    `Des questions ? Réponds directement à cet email — on est là.`,
    ``,
    `Ton équipe ADAPT`,
    ``,
    `© ${new Date().getFullYear()} ADAPT System · hello@adapt-system.be`,
  ].join("\n");

  await sendEmail({
    to,
    subject: `Bienvenue sur ADAPT, ${firstName} !`,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string,
  deepLinkUrl?: string,
) {
  const primaryUrl = deepLinkUrl ?? resetUrl;
  const fallbackSection = deepLinkUrl
    ? `<p class="url-fallback">Si l'app ne s'ouvre pas, utilise ce lien dans ton navigateur :<br />${resetUrl}</p>`
    : `<p class="url-fallback">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br />${resetUrl}</p>`;

  const html = baseTemplate(`
    <h2>Réinitialisation de ton mot de passe</h2>
    <p>Bonjour ${firstName},</p>
    <p>Tu as demandé à réinitialiser ton mot de passe ADAPT. Clique sur le bouton ci-dessous — ce lien est valable <span class="highlight">1 heure</span>.</p>
    <a href="${primaryUrl}" class="cta">RÉINITIALISER MON MOT DE PASSE</a>
    <p>Si tu n'as pas fait cette demande, ignore cet email. Ton mot de passe ne changera pas.</p>
    <div class="divider"></div>
    ${fallbackSection}
  `);

  const textLines = [
    `ADAPT — INTELLIGENCE PERFORMANCE`,
    ``,
    `Réinitialisation de ton mot de passe`,
    ``,
    `Bonjour ${firstName},`,
    ``,
    `Tu as demandé à réinitialiser ton mot de passe ADAPT. Ce lien est valable 1 heure.`,
    ``,
    `Lien de réinitialisation :`,
    primaryUrl,
  ];
  if (deepLinkUrl) {
    textLines.push(``, `Si l'app ne s'ouvre pas, utilise ce lien dans ton navigateur :`, resetUrl);
  }
  textLines.push(
    ``,
    `Si tu n'as pas fait cette demande, ignore cet email. Ton mot de passe ne changera pas.`,
    ``,
    `© ${new Date().getFullYear()} ADAPT System · hello@adapt-system.be`,
  );

  await sendEmail({
    to,
    subject: "Réinitialisation de ton mot de passe ADAPT",
    html,
    text: textLines.join("\n"),
  });
}
