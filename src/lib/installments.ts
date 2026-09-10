import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { resolveTournamentPayout } from "@/lib/connect";
import { markInstallmentPaid } from "@/lib/pricing";

export async function attemptInstallmentCharge(installmentId: string) {
  const installment = await prisma.paymentInstallment.findUnique({
    where: { id: installmentId },
    include: {
      registration: {
        include: { team: { include: { coachUser: true } } },
      },
    },
  });
  // PENDING (scheduled) and FAILED (retryable) can be charged; PAID,
  // CANCELLED and REFUNDED are terminal.
  if (
    !installment ||
    installment.status === "PAID" ||
    installment.status === "CANCELLED" ||
    installment.status === "REFUNDED"
  ) {
    return;
  }

  // Route this installment to the tournament organizer's connected
  // account, same as the first installment did. The flat platform fee was
  // already taken on installment 1, so there's no application fee here.
  const payout = await resolveTournamentPayout(installment.registration.tournamentId);
  if (!payout.ok) {
    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        status: "FAILED",
        attemptCount: { increment: 1 },
        lastError: `Can't route the payment: ${payout.reason}`,
      },
    });
    return;
  }

  const stripeCustomerId = installment.registration.team?.coachUser?.stripeCustomerId;
  if (!stripeCustomerId) {
    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        status: "FAILED",
        attemptCount: { increment: 1 },
        lastError: "No saved payment method on file for this account.",
      },
    });
    return;
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 1,
    });
    const paymentMethodId = paymentMethods.data[0]?.id;
    if (!paymentMethodId) {
      throw new Error("No saved card found for this customer.");
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: installment.amountCents,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        transfer_data: { destination: payout.destination },
        on_behalf_of: payout.destination,
        metadata: { installmentId: installment.id },
      },
      { idempotencyKey: `installment-${installment.id}-${installment.attemptCount}` }
    );

    if (paymentIntent.status === "succeeded") {
      await prisma.paymentInstallment.update({
        where: { id: installmentId },
        data: { stripePaymentIntentId: paymentIntent.id },
      });
      await markInstallmentPaid(installmentId);
    } else {
      await prisma.paymentInstallment.update({
        where: { id: installmentId },
        data: {
          status: "FAILED",
          attemptCount: { increment: 1 },
          lastError: `Payment ${paymentIntent.status} -- may need authentication.`,
          stripePaymentIntentId: paymentIntent.id,
        },
      });
    }
  } catch (err) {
    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        status: "FAILED",
        attemptCount: { increment: 1 },
        lastError: err instanceof Error ? err.message : "Charge failed.",
      },
    });
  }
}
