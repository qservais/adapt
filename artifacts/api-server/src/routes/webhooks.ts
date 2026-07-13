import { Router } from "express";
import { db } from "@workspace/db";
import { shopPacksTable, subscriptionPlansTable, subscriptionMembershipsTable, creditBatchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { logger } from "../lib/logger.js";
import { constructWebhookEvent } from "../services/stripe.service.js";
import { creditBatch } from "../services/credit-ledger.service.js";
import { notifyUser } from "../services/notify.service.js";

const router = Router();

// Mounted directly at /api/webhooks/stripe in app.ts (with express.raw() ahead
// of the global express.json()) — hence "/" here, not "/webhooks/stripe" again.
// req.body MUST be the untouched raw Buffer for signature verification.
router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).send("Missing Stripe-Signature header");
    return;
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    logger.warn({ err }, "webhooks/stripe: signature verification failed");
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // Unhandled event types are expected — Stripe sends many we don't act on.
        break;
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, eventType: event.type }, "webhooks/stripe: handler failed");
    // 500 tells Stripe to retry — safe here since every handler below is idempotent.
    res.status(500).send("Webhook handler error");
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata ?? {};
  const athleteId = metadata["athleteId"];
  if (!athleteId) {
    logger.warn({ sessionId: session.id }, "webhooks/stripe: checkout.session.completed with no athleteId in metadata");
    return;
  }

  if (metadata["type"] === "pack") {
    const packId = metadata["packId"];
    if (!packId) return;

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (paymentIntentId) {
      // Idempotency: Stripe may redeliver this event; never double-credit.
      const [already] = await db.select({ id: creditBatchesTable.id }).from(creditBatchesTable).where(eq(creditBatchesTable.stripePaymentIntentId, paymentIntentId));
      if (already) return;
    }

    const [pack] = await db.select().from(shopPacksTable).where(eq(shopPacksTable.id, packId));
    if (!pack) {
      logger.error({ packId }, "webhooks/stripe: pack referenced by checkout session no longer exists");
      return;
    }

    await creditBatch({
      athleteId,
      creditType: pack.creditType as "collectif" | "individuel",
      credits: pack.credits,
      source: "purchase",
      packId: pack.id,
      stripePaymentIntentId: paymentIntentId,
      pricePaidCents: session.amount_total ?? pack.priceCents,
      validityMonths: pack.validityMonths,
    });

    // Phase 6 (facturation) hooks in here: recordInvoiceForPayment({ athleteId, amountCents: session.amount_total, ... }).

    notifyUser({
      userId: athleteId,
      type: "booking_confirmed",
      title: "Achat confirmé ✓",
      body: `${pack.name} — +${pack.credits} crédit(s) ajoutés à ton solde.`,
    }).catch(() => {});
    return;
  }

  if (metadata["type"] === "subscription") {
    const planId = metadata["planId"];
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!planId || !subscriptionId) return;

    const [already] = await db.select({ id: subscriptionMembershipsTable.id }).from(subscriptionMembershipsTable).where(eq(subscriptionMembershipsTable.stripeSubscriptionId, subscriptionId));
    if (already) return;

    const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));
    if (!plan) return;

    const engagementEndsAt = plan.engagementMonths
      ? new Date(Date.now() + plan.engagementMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(subscriptionMembershipsTable).values({
      athleteId,
      planId,
      stripeSubscriptionId: subscriptionId,
      status: "active",
      engagementEndsAt,
    });

    // Phase 6 hooks in here too, on each recurring invoice.paid event (not modeled yet).

    notifyUser({
      userId: athleteId,
      type: "booking_confirmed",
      title: "Abonnement activé ✓",
      body: `Ton abonnement ${plan.name} est actif.`,
    }).catch(() => {});
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const currentPeriodEndUnix = (subscription as unknown as { current_period_end?: number }).current_period_end;
  await db
    .update(subscriptionMembershipsTable)
    .set({
      status: subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status,
      currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : undefined,
    })
    .where(eq(subscriptionMembershipsTable.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await db
    .update(subscriptionMembershipsTable)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(subscriptionMembershipsTable.stripeSubscriptionId, subscription.id));
}

export default router;
