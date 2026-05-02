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

type Lang = "fr" | "en";

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

function baseTemplate(content: string, lang: Lang, footerText: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
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
      ${footerText}
    </div>
  </div>
</body>
</html>`;
}

const WELCOME_COPY = {
  fr: {
    subject: (name: string) => `Bienvenue sur ADAPT, ${name} !`,
    h2: (name: string) => `Bienvenue sur ADAPT, ${name} !`,
    accountCreated: (role: string) => `Ton compte <span class="highlight">${role}</span> a bien été créé. Tu fais maintenant partie de la communauté ADAPT.`,
    accountCreatedText: (role: string) => `Ton compte ${role} a bien été créé. Tu fais maintenant partie de la communauté ADAPT.`,
    coachStep: "Connecte-toi au tableau de bord coach pour commencer à gérer tes athlètes.",
    athleteStep: "Ouvre l'application ADAPT pour démarrer ton premier entraînement.",
    questions: "Des questions ? Réponds directement à cet email — on est là.",
    signature: "Ton équipe ADAPT",
    coach: "coach",
    athlete: "athlète",
    footer: "Vous recevez cet email car vous avez un compte sur ADAPT System.",
  },
  en: {
    subject: (name: string) => `Welcome to ADAPT, ${name}!`,
    h2: (name: string) => `Welcome to ADAPT, ${name}!`,
    accountCreated: (role: string) => `Your <span class="highlight">${role}</span> account has been created. You're now part of the ADAPT community.`,
    accountCreatedText: (role: string) => `Your ${role} account has been created. You're now part of the ADAPT community.`,
    coachStep: "Sign in to the coach dashboard to start managing your athletes.",
    athleteStep: "Open the ADAPT app to start your first workout.",
    questions: "Any questions? Just reply to this email — we're here.",
    signature: "Your ADAPT team",
    coach: "coach",
    athlete: "athlete",
    footer: "You're receiving this email because you have an account on ADAPT System.",
  },
} as const;

const RESET_COPY = {
  fr: {
    subject: "Réinitialisation de ton mot de passe ADAPT",
    h2: "Réinitialisation de ton mot de passe",
    hello: (name: string) => `Bonjour ${name},`,
    instructions: 'Tu as demandé à réinitialiser ton mot de passe ADAPT. Clique sur le bouton ci-dessous — ce lien est valable <span class="highlight">1 heure</span>.',
    instructionsText: "Tu as demandé à réinitialiser ton mot de passe ADAPT. Ce lien est valable 1 heure.",
    cta: "RÉINITIALISER MON MOT DE PASSE",
    ignore: "Si tu n'as pas fait cette demande, ignore cet email. Ton mot de passe ne changera pas.",
    fallbackApp: (url: string) => `<p class="url-fallback">Si l'app ne s'ouvre pas, utilise ce lien dans ton navigateur :<br />${url}</p>`,
    fallbackBtn: (url: string) => `<p class="url-fallback">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br />${url}</p>`,
    fallbackAppText: "Si l'app ne s'ouvre pas, utilise ce lien dans ton navigateur :",
    linkLabel: "Lien de réinitialisation :",
    footer: "Vous recevez cet email car vous avez un compte sur ADAPT System.",
  },
  en: {
    subject: "Reset your ADAPT password",
    h2: "Reset your password",
    hello: (name: string) => `Hello ${name},`,
    instructions: 'You requested to reset your ADAPT password. Click the button below — this link is valid for <span class="highlight">1 hour</span>.',
    instructionsText: "You requested to reset your ADAPT password. This link is valid for 1 hour.",
    cta: "RESET MY PASSWORD",
    ignore: "If you didn't make this request, ignore this email. Your password won't change.",
    fallbackApp: (url: string) => `<p class="url-fallback">If the app doesn't open, use this link in your browser:<br />${url}</p>`,
    fallbackBtn: (url: string) => `<p class="url-fallback">If the button doesn't work, copy this link into your browser:<br />${url}</p>`,
    fallbackAppText: "If the app doesn't open, use this link in your browser:",
    linkLabel: "Reset link:",
    footer: "You're receiving this email because you have an account on ADAPT System.",
  },
} as const;

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  role: "athlete" | "coach",
  lang: Lang = "fr",
) {
  const c = WELCOME_COPY[lang] ?? WELCOME_COPY.fr;
  const isCoach = role === "coach";
  const roleLabel = isCoach ? c.coach : c.athlete;
  const nextStep = isCoach ? c.coachStep : c.athleteStep;

  const html = baseTemplate(`
    <h2>${c.h2(firstName)}</h2>
    <p>${c.accountCreated(roleLabel)}</p>
    <p>${nextStep}</p>
    <div class="divider"></div>
    <p>${c.questions}</p>
    <p style="color:#555; font-size:13px;">${c.signature}</p>
  `, lang, c.footer);

  const text = [
    `ADAPT — INTELLIGENCE PERFORMANCE`,
    ``,
    c.h2(firstName),
    ``,
    c.accountCreatedText(roleLabel),
    ``,
    nextStep,
    ``,
    c.questions,
    ``,
    c.signature,
    ``,
    `© ${new Date().getFullYear()} ADAPT System · hello@adapt-system.be`,
  ].join("\n");

  await sendEmail({
    to,
    subject: c.subject(firstName),
    html,
    text,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string,
  deepLinkUrl?: string,
  lang: Lang = "fr",
) {
  const c = RESET_COPY[lang] ?? RESET_COPY.fr;
  const primaryUrl = deepLinkUrl ?? resetUrl;
  const fallbackSection = deepLinkUrl
    ? c.fallbackApp(resetUrl)
    : c.fallbackBtn(resetUrl);

  const html = baseTemplate(`
    <h2>${c.h2}</h2>
    <p>${c.hello(firstName)}</p>
    <p>${c.instructions}</p>
    <a href="${primaryUrl}" class="cta">${c.cta}</a>
    <p>${c.ignore}</p>
    <div class="divider"></div>
    ${fallbackSection}
  `, lang, c.footer);

  const textLines = [
    `ADAPT — INTELLIGENCE PERFORMANCE`,
    ``,
    c.h2,
    ``,
    c.hello(firstName),
    ``,
    c.instructionsText,
    ``,
    c.linkLabel,
    primaryUrl,
  ];
  if (deepLinkUrl) {
    textLines.push(``, c.fallbackAppText, resetUrl);
  }
  textLines.push(
    ``,
    c.ignore,
    ``,
    `© ${new Date().getFullYear()} ADAPT System · hello@adapt-system.be`,
  );

  await sendEmail({
    to,
    subject: c.subject,
    html,
    text: textLines.join("\n"),
  });
}
