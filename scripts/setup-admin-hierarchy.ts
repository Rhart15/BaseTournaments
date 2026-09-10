/*
 * One-time production setup for the admin hierarchy + Stripe Connect work.
 *
 * Talks to whatever DATABASE_URL is in .env (production). DRY RUN by
 * default -- prints exactly what it would do. Pass --execute to apply.
 *
 *   npx tsx scripts/setup-admin-hierarchy.ts            # preview
 *   npx tsx scripts/setup-admin-hierarchy.ts --execute  # apply
 *
 * What it does:
 *   1. Makes the three lead-admin accounts (Ray, Shannon, Ashley), each
 *      with a freshly generated one-time password (printed once). If an
 *      account with that email already exists it is reset in place --
 *      same row, brand-new password, promoted to lead admin.
 *   2. Demotes/removes any OTHER admin account (there shouldn't be any).
 *   3. Assigns every existing tournament to Shannon, for him to reassign
 *      to the real organizers later.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Read DATABASE_URL straight from .env -- the shell in this environment
// sometimes carries a stale placeholder value that would otherwise win.
function databaseUrl(): string {
  const text = readFileSync(join(__dirname, "..", ".env"), "utf8");
  const line = text.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  if (!line) throw new Error("DATABASE_URL not found in .env");
  let v = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
const EXECUTE = process.argv.includes("--execute");

const LEADS = [
  { email: "rdhart10916@gmail.com", name: "Ray Hart" },
  { email: "shannon@basetournament.com", name: "Shannon" },
  { email: "ashley@basetournament.com", name: "Ashley" },
];
const BACKFILL_OWNER_EMAIL = "shannon@basetournament.com";

function tempPassword(): string {
  const core = randomBytes(9).toString("base64url").replace(/[-_]/g, "").slice(0, 12);
  return `BASE-${core}-7!`;
}

async function main() {
  console.log(`\nMode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}\n`);

  const allAdmins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    include: { _count: { select: { ownedTournaments: true, teams: true, athletes: true } } },
  });
  const targetEmails = new Set(LEADS.map((l) => l.email.toLowerCase()));
  const strays = allAdmins.filter((a) => !targetEmails.has(a.email.toLowerCase()));

  console.log("LEAD ADMINS (create or reset in place, new one-time password):");
  for (const l of LEADS) {
    const existing = allAdmins.find((a) => a.email.toLowerCase() === l.email.toLowerCase());
    console.log(`  - ${l.email}  ${existing ? `(exists as "${existing.name}", role ${existing.role}) -> reset + lead` : "(new account) -> create"}`);
  }

  console.log("\nOTHER admin accounts (demote to COACH):");
  if (strays.length === 0) console.log("  (none)");
  for (const s of strays) {
    console.log(`  - ${s.email}  owns ${s._count.ownedTournaments} tournaments, ${s._count.teams} teams, ${s._count.athletes} athletes`);
  }

  const tournamentCount = await prisma.tournament.count();
  const unowned = await prisma.tournament.count({ where: { ownerId: null } });
  console.log(`\nBACKFILL: assign all ${tournamentCount} tournaments (${unowned} currently unowned) to ${BACKFILL_OWNER_EMAIL}\n`);

  if (!EXECUTE) {
    console.log("DRY RUN complete. Re-run with --execute to apply.\n");
    return;
  }

  // 1 + 2: lead accounts
  const issued: { email: string; password: string }[] = [];
  for (const l of LEADS) {
    const password = tempPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: l.email.toLowerCase() },
      update: { name: l.name, passwordHash, role: "ADMIN", isSuperAdmin: true, mustChangePassword: true },
      create: {
        email: l.email.toLowerCase(),
        name: l.name,
        passwordHash,
        role: "ADMIN",
        isSuperAdmin: true,
        mustChangePassword: true,
      },
    });
    issued.push({ email: l.email, password });
  }

  for (const s of strays) {
    await prisma.user.update({
      where: { id: s.id },
      data: { role: "COACH", isSuperAdmin: false },
    });
    console.log(`Demoted ${s.email} to COACH`);
  }

  // 3: backfill ownership
  const shannon = await prisma.user.findUnique({ where: { email: BACKFILL_OWNER_EMAIL } });
  if (!shannon) throw new Error("Shannon account missing after upsert");
  const res = await prisma.tournament.updateMany({ data: { ownerId: shannon.id } });
  console.log(`Assigned ${res.count} tournaments to ${BACKFILL_OWNER_EMAIL}`);

  console.log("\n=== ONE-TIME PASSWORDS (copy now, send securely) ===");
  for (const i of issued) console.log(`  ${i.email}  ->  ${i.password}`);
  console.log("\nEach admin will be asked to change it after signing in.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
