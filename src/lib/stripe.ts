import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Thrown at import time only when an API route actually needs Stripe,
  // so the rest of the site still builds/runs without keys configured yet.
  console.warn(
    "STRIPE_SECRET_KEY is not set — payment routes will fail until it is."
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-08-26.dahlia",
});

// Gets the Stripe Customer tied to this user's account, creating one on
// first checkout if they don't have one yet. Attaching a Customer to the
// Checkout Session (with setup_future_usage below) is what lets Stripe
// offer "use a saved card" on a repeat registration -- no extra UI needed,
// Stripe Checkout shows it automatically for a returning customer.
export async function getOrCreateStripeCustomer({
  userId,
  existingCustomerId,
  email,
  name,
}: {
  userId: string;
  existingCustomerId: string | null;
  email: string;
  name: string;
}): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const { prisma } = await import("@/lib/db");
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
