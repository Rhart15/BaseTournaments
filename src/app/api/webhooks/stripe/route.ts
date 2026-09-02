import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// Stripe requires the raw request body to verify the webhook signature,
// so this route must not run through any body-parsing middleware.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const registrationId = session.metadata?.registrationId;

    if (registrationId) {
      await prisma.registration.update({
        where: { id: registrationId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
  }

  return NextResponse.json({ received: true });
}
