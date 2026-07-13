import { Router } from "express";
import { db } from "@workspace/db";
import {
  shopPacksTable,
  shopPromosTable,
  subscriptionPlansTable,
  subscriptionMembershipsTable,
  usersTable,
  creditTransactionsTable,
  creditBatchesTable,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { getBalances, creditBatch } from "../services/credit-ledger.service.js";
import { createOneOffCheckoutSession, createSubscriptionCheckoutSession, isStripeConfigured } from "../services/stripe.service.js";
import { notifyUser } from "../services/notify.service.js";
import { isPromoActive } from "../lib/ledger-math.js";

const router = Router();

// ─── Price resolution ──────────────────────────────────────────────────────
// isPromoActive lives in lib/ledger-math.ts (pure, unit-tested in
// tests/credit-ledger.test.ts) — the mockup this spec is based on only ever
// displayed the promo date without checking it, which is exactly the bug a
// real implementation must not repeat.
async function resolvePackPrice(packId: string, listPriceCents: number): Promise<{ priceCents: number; promoId: string | null }> {
  const now = new Date();
  const candidates = await db
    .select()
    .from(shopPromosTable)
    .where(eq(shopPromosTable.packId, packId))
    .orderBy(desc(shopPromosTable.createdAt));
  const promo = candidates.find((p) => isPromoActive(p, now));
  if (promo) return { priceCents: promo.discountedPriceCents, promoId: promo.id };
  return { priceCents: listPriceCents, promoId: null };
}

// ─── Member-facing catalogue ────────────────────────────────────────────────

router.get("/shop/packs", authenticate, requireRole("athlete"), async (_req, res) => {
  try {
    const packs = await db.select().from(shopPacksTable).where(eq(shopPacksTable.isActive, true));
    const withPrices = await Promise.all(
      packs.map(async (p) => {
        const { priceCents, promoId } = await resolvePackPrice(p.id, p.priceCents);
        return { ...p, currentPriceCents: priceCents, hasActivePromo: promoId !== null };
      }),
    );
    res.json(withPrices);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/shop/subscriptions", authenticate, requireRole("athlete"), async (_req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true));
    res.json(plans);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/users/me/credits", authenticate, requireRole("athlete"), async (req, res) => {
  try {
    const balances = await getBalances(req.user!.userId);
    res.json(balances);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Checkout ────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  type: z.enum(["pack", "subscription"]),
  id: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

router.post("/shop/checkout-session", authenticate, requireRole("athlete"), async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  if (!isStripeConfigured()) {
    res.status(503).json({ error: { code: "STRIPE_NOT_CONFIGURED", message: "Le paiement n'est pas encore configuré." } });
    return;
  }

  const athleteId = req.user!.userId;
  const { type, id, successUrl, cancelUrl } = parsed.data;

  try {
    if (type === "pack") {
      const [pack] = await db.select().from(shopPacksTable).where(and(eq(shopPacksTable.id, id), eq(shopPacksTable.isActive, true)));
      if (!pack) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Pack introuvable" } });
        return;
      }
      const { priceCents } = await resolvePackPrice(pack.id, pack.priceCents);
      const session = await createOneOffCheckoutSession({
        athleteId,
        name: pack.name,
        priceCents,
        successUrl,
        cancelUrl,
        metadata: { type: "pack", packId: pack.id, athleteId },
      });
      res.json({ checkoutUrl: session.url });
      return;
    }

    const [plan] = await db.select().from(subscriptionPlansTable).where(and(eq(subscriptionPlansTable.id, id), eq(subscriptionPlansTable.isActive, true)));
    if (!plan || !plan.stripePriceId) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Abonnement introuvable ou non configuré côté Stripe" } });
      return;
    }
    const session = await createSubscriptionCheckoutSession({
      athleteId,
      stripePriceId: plan.stripePriceId,
      successUrl,
      cancelUrl,
      metadata: { type: "subscription", planId: plan.id, athleteId },
    });
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: pack CRUD ────────────────────────────────────────────────────────

const packSchema = z.object({
  creditType: z.enum(["collectif", "individuel"]),
  name: z.string().min(1).max(100),
  credits: z.number().int().min(1),
  priceCents: z.number().int().min(0),
  validityMonths: z.number().int().min(1).max(24).nullable().optional(),
  tag: z.string().max(30).nullable().optional(),
});

router.get("/coach/shop/packs", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const packs = await db.select().from(shopPacksTable).where(eq(shopPacksTable.coachId, req.user!.userId)).orderBy(asc(shopPacksTable.createdAt));
    res.json(packs);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.post("/coach/shop/packs", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = packSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const [pack] = await db.insert(shopPacksTable).values({ coachId: req.user!.userId, ...parsed.data }).returning();
    res.status(201).json(pack);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.put("/coach/shop/packs/:id", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = packSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db.select({ id: shopPacksTable.id }).from(shopPacksTable).where(and(eq(shopPacksTable.id, id), eq(shopPacksTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Pack introuvable" } });
      return;
    }
    const [pack] = await db.update(shopPacksTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(shopPacksTable.id, id)).returning();
    res.json(pack);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/shop/packs/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db.select({ id: shopPacksTable.id }).from(shopPacksTable).where(and(eq(shopPacksTable.id, id), eq(shopPacksTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Pack introuvable" } });
      return;
    }
    // Soft-delete: a purchased pack may still be referenced by credit_batches.
    await db.update(shopPacksTable).set({ isActive: false, updatedAt: new Date() }).where(eq(shopPacksTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: promos ───────────────────────────────────────────────────────────

const promoSchema = z.object({
  packId: z.string().uuid(),
  discountedPriceCents: z.number().int().min(0),
  durationDays: z.number().int().min(1).max(90),
});

router.post("/coach/shop/promos", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = promoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const { packId, discountedPriceCents, durationDays } = parsed.data;
    const [pack] = await db.select({ id: shopPacksTable.id }).from(shopPacksTable).where(and(eq(shopPacksTable.id, packId), eq(shopPacksTable.coachId, coachId)));
    if (!pack) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Pack introuvable" } });
      return;
    }
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const [promo] = await db.insert(shopPromosTable).values({ packId, discountedPriceCents, startsAt, expiresAt, createdBy: coachId }).returning();
    res.status(201).json(promo);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.delete("/coach/shop/promos/:id", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [promo] = await db
      .select({ id: shopPromosTable.id })
      .from(shopPromosTable)
      .innerJoin(shopPacksTable, eq(shopPromosTable.packId, shopPacksTable.id))
      .where(and(eq(shopPromosTable.id, id), eq(shopPacksTable.coachId, coachId)));
    if (!promo) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Promo introuvable" } });
      return;
    }
    // End it now rather than deleting — an ended promo is meaningful history.
    await db.update(shopPromosTable).set({ expiresAt: new Date() }).where(eq(shopPromosTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: subscription plan pricing ────────────────────────────────────────

const subPlanUpdateSchema = z.object({
  priceCents: z.number().int().min(0).optional(),
  engagementMonths: z.number().int().min(1).max(12).nullable().optional(),
});

router.put("/coach/shop/subscriptions/:id", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = subPlanUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const coachId = req.user!.userId;
    const id = String(req.params["id"]);
    const [existing] = await db.select({ id: subscriptionPlansTable.id }).from(subscriptionPlansTable).where(and(eq(subscriptionPlansTable.id, id), eq(subscriptionPlansTable.coachId, coachId)));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Abonnement introuvable" } });
      return;
    }
    const [plan] = await db.update(subscriptionPlansTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(subscriptionPlansTable.id, id)).returning();
    res.json(plan);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

// ─── Coach: gift credits ─────────────────────────────────────────────────────

const giftSchema = z.object({
  athleteIds: z.array(z.string().uuid()).min(1),
  creditType: z.enum(["collectif", "individuel"]),
  quantity: z.number().int().min(1).max(50),
  message: z.string().max(280).optional(),
});

router.post("/coach/credits/gift", authenticate, requireRole("coach"), async (req, res) => {
  const parsed = giftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
    return;
  }
  try {
    const { athleteIds, creditType, quantity, message } = parsed.data;
    const creditLabel = creditType === "collectif" ? "cours collectif" : "1:1";
    for (const athleteId of athleteIds) {
      await creditBatch({ athleteId, creditType, credits: quantity, source: "gift", note: message });
      notifyUser({
        userId: athleteId,
        type: "gift_credits",
        title: "Crédit offert 🎁",
        body: message
          ? `Ton coach t'offre ${quantity} crédit(s) ${creditLabel} — "${message}"`
          : `Ton coach t'offre ${quantity} crédit(s) ${creditLabel} !`,
      }).catch(() => {});
    }
    res.status(201).json({ success: true, recipientCount: athleteIds.length });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

router.get("/coach/clients/:athleteId/credits", authenticate, requireRole("coach"), async (req, res) => {
  try {
    const coachId = req.user!.userId;
    const athleteId = String(req.params["athleteId"]);
    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (!athlete || athlete.coachId !== coachId) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès refusé" } });
      return;
    }
    const balances = await getBalances(athleteId);
    const transactions = await db
      .select({
        id: creditTransactionsTable.id,
        delta: creditTransactionsTable.delta,
        reason: creditTransactionsTable.reason,
        createdAt: creditTransactionsTable.createdAt,
        creditType: creditBatchesTable.creditType,
      })
      .from(creditTransactionsTable)
      .innerJoin(creditBatchesTable, eq(creditTransactionsTable.batchId, creditBatchesTable.id))
      .where(eq(creditTransactionsTable.athleteId, athleteId))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(30);
    res.json({
      balances,
      transactions: transactions.map((t) => ({ ...t, createdAt: t.createdAt?.toISOString() ?? null })),
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Server error" } });
  }
});

export default router;
