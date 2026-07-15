import { Router } from "express";
import { db } from "@workspace/db";
import { shopPacksTable, subscriptionPlansTable, subscriptionMembershipsTable, creditBatchesTable, usersTable, invoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { logger } from "../lib/logger.js";
import { constructWebhookEvent } from "../services/stripe.service.js";
import { creditBatch } from "../services/credit-ledger.service.js";
import { notifyUser } from "../services/notify.service.js";
import { issueInvoice } from "../services/invoicing.service.js";

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
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
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

    const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, athleteId));
    if (athlete?.coachId) {
      issueInvoice({
        coachId: athlete.coachId,
        athleteId,
        description: pack.name,
        amountCentsTtc: session.amount_total ?? pack.priceCents,
        paymentMethod: "stripe",
        sourceType: "shop_purchase",
        sourceId: pack.id,
      }).catch((err) => logger.error({ err, packId: pack.id, athleteId }, "webhooks/stripe: issueInvoice failed for pack purchase"));
    } else {
      logger.error({ athleteId }, "webhooks/stripe: athlete has no coach — cannot issue invoice");
    }

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

    // No invoice issued here — Stripe fires invoice.paid for every billing
    // cycle including this first one, so invoicing happens uniformly in
    // handleInvoicePaid() below rather than once here and then again there
    // (which would double-invoice the first period).

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

// Fires for every subscription billing cycle, including the first (see the
// comment in handleCheckoutCompleted for why subscriptions are invoiced only
// here, uniformly, rather than once at checkout and again per cycle).
async function handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
  // As of the API version this SDK targets, `Invoice.subscription` was moved
  // under `Invoice.parent.subscription_details.subscription`.
  const subscriptionRef = stripeInvoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId) return; // one-off invoices (not subscription-related) are out of scope here

  const [membership] = await db.select().from(subscriptionMembershipsTable).where(eq(subscriptionMembershipsTable.stripeSubscriptionId, subscriptionId));
  if (!membership) {
    logger.warn({ subscriptionId }, "webhooks/stripe: invoice.paid for unknown subscription membership");
    return;
  }

  const [already] = await db.select({ id: invoicesTable.id }).from(invoicesTable).where(eq(invoicesTable.sourceId, stripeInvoice.id));
  if (already) return; // idempotency: Stripe may redeliver this event

  const [plan] = await db.select({ name: subscriptionPlansTable.name }).from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, membership.planId));
  const [athlete] = await db.select({ coachId: usersTable.coachId }).from(usersTable).where(eq(usersTable.id, membership.athleteId));
  if (!athlete?.coachId) {
    logger.error({ athleteId: membership.athleteId }, "webhooks/stripe: athlete has no coach — cannot issue subscription invoice");
    return;
  }

  await issueInvoice({
    coachId: athlete.coachId,
    athleteId: membership.athleteId,
    description: plan?.name ?? "Abonnement",
    amountCentsTtc: stripeInvoice.amount_paid,
    paymentMethod: "stripe",
    sourceType: "subscription",
    sourceId: stripeInvoice.id,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await db
    .update(subscriptionMembershipsTable)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(subscriptionMembershipsTable.stripeSubscriptionId, subscription.id));
}

export default router;
