import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { usersTable, studioSettingsTable } from "@workspace/db";
import { eq, and, gt, asc } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/email.js";

const router = Router();

const isProduction = process.env["NODE_ENV"] === "production";

if (isProduction && !process.env["JWT_SECRET"]) {
  throw new Error("JWT_SECRET environment variable is required in production");
}
if (isProduction && !process.env["JWT_REFRESH_SECRET"]) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required in production");
}

const JWT_SECRET = process.env["JWT_SECRET"] ?? "adapt_jwt_secret_dev_only";
const JWT_REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"] ?? "adapt_refresh_secret_dev_only";

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives. Réessaie dans 15 minutes." } },
});

// A 6-digit PIN only has 1M combinations — throttle guesses on top of bcrypt's
// inherent per-attempt cost (defense in depth, not a substitute for it).
const loginCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives. Réessaie dans 15 minutes." } },
});

// Bump when the consent text in the athlete-app onboarding screen changes materially.
const CONSENT_VERSION = "mouvup-2026-07";

function generateTokens(userId: string, role: string, email: string, language?: string | null) {
  const payload: Record<string, unknown> = { userId, role, email };
  if (language) payload["language"] = language;
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "30d" });
  return { accessToken, refreshToken };
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  role: z.enum(["athlete", "coach"]),
});

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  const { email, password, firstName, lastName, role } = parsed.data;

  try {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "Email already in use" } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let inviteCode: string | undefined;

    {
      let unique = false;
      while (!unique) {
        inviteCode = generateInviteCode();
        const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.inviteCode, inviteCode));
        if (existing.length === 0) unique = true;
      }
    }

    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      inviteCode,
    }).returning();

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email, user.language);
    await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

    sendWelcomeEmail(email, firstName, role, req.locale).catch(() => {});

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        fitnessLevel: user.fitnessLevel,
        primaryGoal: user.primaryGoal,
        cycleTracking: user.cycleTracking,
        coachId: user.coachId,
        inviteCode: user.inviteCode,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// Open, self-service 2-step athlete signup (identity + sport profile/PAR-Q/consent
// merged into one atomic call, matching the product spec's onboarding wizard).
// Distinct from /auth/register: athletes here authenticate with a 6-digit PIN
// (`loginCode`) instead of a password, and the account is auto-linked to whichever
// coach owns the studio's settings row (mono-coach V1 — see studio-settings.ts).
const registerAthleteSchema = z
  .object({
    email: z.string().email(),
    loginCode: z.string().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(1),
    age: z.number().int().min(10).max(100).optional(),
    primaryGoal: z.string().max(20).optional(),
    fitnessLevel: z.string().max(20).optional(),
    trainingFrequency: z.number().int().min(0).max(14).optional(),
    hasInjuryHistory: z.boolean(),
    injuries: z.string().optional(),
    medicalContraindication: z.boolean(),
    acquisitionSource: z.string().max(50).optional(),
    consent: z.literal(true),
  })
  .refine((data) => !data.hasInjuryHistory || !!data.injuries?.trim(), {
    message: "Merci de préciser tes blessures ou antécédents",
    path: ["injuries"],
  });

router.post("/auth/register-athlete", async (req, res) => {
  const parsed = registerAthleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }

  const {
    email, loginCode, firstName, lastName, phone, age,
    primaryGoal, fitnessLevel, trainingFrequency,
    hasInjuryHistory, injuries, medicalContraindication, acquisitionSource,
  } = parsed.data;

  try {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "Email already in use" } });
      return;
    }

    const loginCodeHash = await bcrypt.hash(loginCode, 12);

    let inviteCode: string | undefined;
    {
      let unique = false;
      while (!unique) {
        inviteCode = generateInviteCode();
        const existingCode = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.inviteCode, inviteCode));
        if (existingCode.length === 0) unique = true;
      }
    }

    // Mono-coach V1: whoever owns the (first-configured) studio_settings row
    // receives new open signups. No hardcoded coach identity in code.
    const [studio] = await db
      .select({ coachId: studioSettingsTable.coachId })
      .from(studioSettingsTable)
      .orderBy(asc(studioSettingsTable.createdAt))
      .limit(1);

    const [user] = await db.insert(usersTable).values({
      email,
      loginCodeHash,
      firstName,
      lastName,
      phone,
      age,
      role: "athlete",
      primaryGoal,
      fitnessLevel,
      trainingFrequency,
      hasInjuryHistory,
      injuries: hasInjuryHistory ? injuries : null,
      medicalContraindication,
      acquisitionSource,
      consentAcceptedAt: new Date(),
      consentVersion: CONSENT_VERSION,
      coachId: studio?.coachId ?? null,
      inviteCode,
    }).returning();

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email, user.language);
    await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

    sendWelcomeEmail(email, firstName, "athlete", req.locale).catch(() => {});

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        fitnessLevel: user.fitnessLevel,
        primaryGoal: user.primaryGoal,
        cycleTracking: user.cycleTracking,
        coachId: user.coachId,
        inviteCode: user.inviteCode,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" } });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" } });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email, user.language);
    await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        fitnessLevel: user.fitnessLevel,
        primaryGoal: user.primaryGoal,
        cycleTracking: user.cycleTracking,
        coachId: user.coachId,
        inviteCode: user.inviteCode,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const loginCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

// Athlete-app login: email + 6-digit PIN, in one step (no emailed one-time code —
// the PIN is the long-lived credential the athlete chose at signup, hashed like a
// password). Coach dashboard keeps using /auth/login with a real password.
router.post("/auth/login-code", loginCodeLimiter, async (req, res) => {
  const parsed = loginCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { email, code } = parsed.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || !user.loginCodeHash) {
      res.status(401).json({ error: { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" } });
      return;
    }

    const valid = await bcrypt.compare(code, user.loginCodeHash);
    if (!valid) {
      res.status(401).json({ error: { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" } });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email, user.language);
    await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        fitnessLevel: user.fitnessLevel,
        primaryGoal: user.primaryGoal,
        cycleTracking: user.cycleTracking,
        coachId: user.coachId,
        inviteCode: user.inviteCode,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post("/auth/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { refreshToken } = parsed.data;

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string; role: string; email: string };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: { code: "AUTH_TOKEN_EXPIRED", message: "Invalid refresh token" } });
      return;
    }

    const tokens = generateTokens(user.id, user.role, user.email, user.language);
    await db.update(usersTable).set({ refreshToken: tokens.refreshToken }).where(eq(usersTable.id, user.id));

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        weightKg: user.weightKg,
        heightCm: user.heightCm,
        fitnessLevel: user.fitnessLevel,
        primaryGoal: user.primaryGoal,
        cycleTracking: user.cycleTracking,
        coachId: user.coachId,
        inviteCode: user.inviteCode,
      },
    });
  } catch {
    res.status(401).json({ error: { code: "AUTH_TOKEN_EXPIRED", message: "Invalid refresh token" } });
  }
});

router.post("/auth/logout", authenticate, async (req, res) => {
  try {
    await db.update(usersTable).set({ refreshToken: null }).where(eq(usersTable.id, req.user!.userId));
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post("/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { email } = parsed.data;

  res.json({ success: true, message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });

  try {
    const [user] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, email: usersTable.email, role: usersTable.role, language: usersTable.language })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    if (!user) return;

    const resetToken = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await db.update(usersTable)
      .set({ passwordResetToken: resetToken, passwordResetExpiry: expiry })
      .where(eq(usersTable.id, user.id));

    const SITE_URL = process.env["SITE_URL"] ?? process.env["DASHBOARD_URL"] ?? "https://adapt-system.be";
    const resetUrl = user.role === "coach"
      ? `${SITE_URL}/coach-dashboard/reset-password?token=${resetToken}`
      : `${SITE_URL}/reset-password?token=${resetToken}`;
    const deepLinkUrl = user.role === "athlete"
      ? `athlete-app://auth/reset-password?token=${resetToken}`
      : undefined;
    const lang = (user.language === "en" ? "en" : user.language === "fr" ? "fr" : req.locale) as "fr" | "en";
    await sendPasswordResetEmail(user.email, user.firstName, resetUrl, deepLinkUrl, lang, user.role === "coach" ? "password" : "code");
  } catch (err) {
    console.error("forgot-password background error:", err);
  }
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { token, newPassword } = parsed.data;

  try {
    const now = new Date();
    const [user] = await db.select({ id: usersTable.id, passwordResetExpiry: usersTable.passwordResetExpiry })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.passwordResetToken, token),
          gt(usersTable.passwordResetExpiry, now),
        ),
      );

    if (!user) {
      res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Lien invalide ou expiré." } });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null, refreshToken: null })
      .where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

const resetLoginCodeSchema = z.object({
  token: z.string().min(1),
  newLoginCode: z.string().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
});

// Mirrors /auth/reset-password exactly, but sets loginCodeHash instead of
// passwordHash. Reuses the same emailed reset link/token — /auth/forgot-password
// doesn't need to know which credential type an account uses.
router.post("/auth/reset-login-code", async (req, res) => {
  const parsed = resetLoginCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  const { token, newLoginCode } = parsed.data;

  try {
    const now = new Date();
    const [user] = await db.select({ id: usersTable.id, passwordResetExpiry: usersTable.passwordResetExpiry })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.passwordResetToken, token),
          gt(usersTable.passwordResetExpiry, now),
        ),
      );

    if (!user) {
      res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Lien invalide ou expiré." } });
      return;
    }

    const loginCodeHash = await bcrypt.hash(newLoginCode, 12);
    await db.update(usersTable)
      .set({ loginCodeHash, passwordResetToken: null, passwordResetExpiry: null, refreshToken: null })
      .where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "Code mis à jour avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
