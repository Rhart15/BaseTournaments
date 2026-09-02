import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const registerSchema = z.object({
  tournamentId: z.string(),
  divisionId: z.string(),
  teamName: z.string().min(2),
  coachName: z.string().min(2),
  coachEmail: z.string().email(),
  coachPhone: z.string().min(7),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration details", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { tournamentId, divisionId, teamName, coachName, coachEmail, coachPhone } =
    parsed.data;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Enforce the team cap before taking payment.
  const registeredCount = await prisma.registration.count({
    where: { tournamentId, status: { in: ["PAID", "PENDING"] } },
  });
  if (registeredCount >= tournament.teamCap) {
    return NextResponse.json(
      { error: "This tournament is full" },
      { status: 409 }
    );
  }

  const registration = await prisma.registration.create({
    data: {
      tournamentId,
      divisionId,
      teamName,
      coachName,
      coachEmail,
      coachPhone,
      status: "PENDING",
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: coachEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: tournament.entryFeeCents,
          product_data: {
            name: `${tournament.name} — ${teamName} entry fee`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      registrationId: registration.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/register/success?registration=${registration.id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tournaments/${tournamentId}`,
  });

  await prisma.registration.update({
    where: { id: registration.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
