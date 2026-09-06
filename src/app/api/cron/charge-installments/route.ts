import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attemptInstallmentCharge } from "@/lib/installments";

// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
// sends "Authorization: Bearer $CRON_SECRET" on cron-triggered requests
// when that env var is set -- this check is what stops anyone else from
// hitting this URL and forcing charges to run early.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.paymentInstallment.findMany({
    where: { status: "PENDING", dueDate: { lte: new Date() } },
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  for (const { id } of due) {
    await attemptInstallmentCharge(id);
    const updated = await prisma.paymentInstallment.findUnique({ where: { id } });
    if (updated?.status === "PAID") succeeded++;
    else failed++;
  }

  return NextResponse.json({ processed: due.length, succeeded, failed });
}
