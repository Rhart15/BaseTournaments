// One-off: the event wizard's `status` and `slug` columns were just added.
// New tournaments default to status=DRAFT (correct going forward), but the
// 23 tournaments that predate this column landed as DRAFT too when the
// column was added -- this backfills them to PUBLISHED (so nothing drops
// off the public site) and generates a slug for each.
//
//   node scripts/backfill-event-wizard-fields.mjs           # dry run
//   node scripts/backfill-event-wizard-fields.mjs --execute # apply
//
// Run from the project root.

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const EXECUTE = process.argv.includes("--execute");

// Mirrors src/lib/eventSlug.ts -- duplicated here so this plain-Node script
// doesn't need a TS loader; keep the two in sync if the slug format changes.
function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEventSlugBase({ name, city, startDate }) {
  // city is free text and already includes the state (e.g. "Conway, AR");
  // Tournament.state is a separate, often-stale default, so skip it here.
  const parts = [name, city, String(startDate.getFullYear())].filter((p) => p && p.trim());
  return slugify(parts.join(" "));
}

async function ensureUniqueSlug(prisma, base, excludeId) {
  let candidate = base || "event";
  let suffix = 1;
  for (;;) {
    const collision = await prisma.tournament.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!collision) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

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

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: "DRAFT", slug: null },
    select: { id: true, name: true, city: true, startDate: true, status: true, slug: true },
    orderBy: { startDate: "asc" },
  });

  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}`);
  console.log(`${tournaments.length} tournament(s) to backfill.\n`);

  for (const t of tournaments) {
    const base = buildEventSlugBase({ name: t.name, city: t.city, startDate: t.startDate });
    const slug = await ensureUniqueSlug(prisma, base, t.id);

    if (!EXECUTE) {
      console.log(`  PLAN  ${t.name}  ->  status=PUBLISHED, slug="${slug}"`);
      continue;
    }

    await prisma.tournament.update({
      where: { id: t.id },
      data: { status: "PUBLISHED", slug },
    });
    console.log(`  OK    ${t.name}  ->  slug="${slug}"`);
  }

  if (!EXECUTE) console.log("\nDRY RUN complete. Re-run with --execute.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
