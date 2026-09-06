import { NextResponse } from "next/server";
import { canManageRegistration } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";
import { attemptInstallmentCharge } from "@/lib/installments";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; installmentId: string }> }
) {
  const { id, installmentId } = await params;
  if (!(await canManageRegistration(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installment = await prisma.paymentInstallment.findUnique({
    where: { id: installmentId },
  });
  if (!installment || installment.registrationId !== id) {
    return NextResponse.json({ error: "Installment not found." }, { status: 404 });
  }

  await attemptInstallmentCharge(installmentId);

  const updated = await prisma.paymentInstallment.findUnique({
    where: { id: installmentId },
  });
  return NextResponse.json({ installment: updated });
}
