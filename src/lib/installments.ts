import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
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
  if (!installment || installment.status === "PAID") return;

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: installment.amountCents,
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { installmentId: installment.id },
    });

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
