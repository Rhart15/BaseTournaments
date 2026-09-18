// One-off: seed the new DivisionOption/SubdivisionOption master lists.
// Values are sourced from the actual Division.label values already in use
// across the 23 existing tournaments (see the Divisions-wizard-step
// session), not guessed -- plus "Major" from Ray's own example, which
// hasn't been used yet but is a standard skill tier.
//
//   node scripts/seed-division-options.mjs           # dry run
//   node scripts/seed-division-options.mjs --execute # apply
//
// Run from the project root. Safe to re-run -- skips labels that already exist.

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const EXECUTE = process.argv.includes("--execute");

function envVal(file, key) {
  const txt = readFileSync(file, "utf8");
  const line = txt.split(/\r?\n/).find((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
  if (!line) return null;
  let v = line.replace(new RegExp(`^\\s*${key}\\s*=\\s*`), "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

const DB_URL = envVal(".env", "DATABASE_URL");
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const DIVISION_OPTIONS = [
  "6U", "7U", "8U", "9U", "10U", "11U", "12U", "14U", "16U", "18U", "16/18U", "Open",
];
const SUBDIVISION_OPTIONS = ["Open", "AAA", "AA", "A", "Major", "Rec", "C"];

async function seed(model, labels) {
  let sortOrder = 0;
  for (const label of labels) {
    const existing = await model.findUnique({ where: { label } });
    if (existing) {
      console.log(`  SKIP  "${label}" already exists`);
      sortOrder += 1;
      continue;
    }
    if (!EXECUTE) {
      console.log(`  PLAN  "${label}" (sortOrder ${sortOrder})`);
      sortOrder += 1;
      continue;
    }
    await model.create({ data: { label, sortOrder } });
    console.log(`  OK    "${label}"`);
    sortOrder += 1;
  }
}

async function main() {
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}\n`);

  console.log("DivisionOption:");
  await seed(prisma.divisionOption, DIVISION_OPTIONS);

  console.log("\nSubdivisionOption:");
  await seed(prisma.subdivisionOption, SUBDIVISION_OPTIONS);

  if (!EXECUTE) console.log("\nDRY RUN complete. Re-run with --execute.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
