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
