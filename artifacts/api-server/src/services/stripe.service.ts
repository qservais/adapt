import Stripe from "stripe";
import { logger } from "../lib/logger.js";

const STRIPE_SECRET_KEY = process.env["STRIPE_SECRET_KEY"];
const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"];

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
} else {
  logger.warn("STRIPE_SECRET_KEY not set — Stripe checkout/webhooks are disabled");
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured on this server");
    this.name = "StripeNotConfiguredError";
  }
}

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

function requireStripe(): Stripe {
  if (!stripe) throw new StripeNotConfiguredError();
  return stripe;
}

interface OneOffCheckoutParams {
  athleteId: string;
  name: string;
  priceCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

// Unlike a subscription, packs/à-la-carte bookings are one-time payments — the
// server always resolves the actual price here (including any active promo),
// the client never gets to hand us a price.
export async function createOneOffCheckoutSession(params: OneOffCheckoutParams): Promise<Stripe.Checkout.Session> {
  const client = requireStripe();
  return client.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: params.priceCents,
          product_data: { name: params.name },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.athleteId,
    metadata: params.metadata,
  });
}

interface SubscriptionCheckoutParams {
  athleteId: string;
  stripePriceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export async function createSubscriptionCheckoutSession(params: SubscriptionCheckoutParams): Promise<Stripe.Checkout.Session> {
  const client = requireStripe();
  return client.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: params.stripePriceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.athleteId,
    subscription_data: { metadata: params.metadata },
    metadata: params.metadata,
  });
}

// Verifies the raw request body against the Stripe-Signature header. Must be
// called with the untouched raw body — see app.ts, where the webhook route is
// mounted with express.raw() ahead of the global express.json() parser.
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const client = requireStripe();
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook signatures");
  }
  return client.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}
