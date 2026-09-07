// Creates one admin login. Run with:
//   npx tsx scripts/create-admin.ts
//
// Talks to whatever DATABASE_URL is in your .env -- your real production
// database. Safe to run any time; it only adds one new row, it doesn't
// touch or delete anything else.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "shannon@basetournament.com";
const ADMIN_NAME = "Shannon";
const ADMIN_PASSWORD = "Base" + Math.random().toString(36).slice(2, 8) + "!9";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`An account with ${ADMIN_EMAIL} already exists (role: ${existing.role}).`);
    console.log("Nothing created. If you want to reset this account's password instead, let me know.");
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: ADMIN_NAME,
      role: "ADMIN",
      isSuperAdmin: true,
    },
  });

  console.log("=== Admin account created ===");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("(Shown only here, not stored anywhere in plain text -- copy it now and send it to Shannon securely.)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
