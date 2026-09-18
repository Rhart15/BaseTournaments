// One-off: upload the 4 confirmed tournament flyers to Vercel Blob and set
// each tournament's flyerUrl -- same two operations the
// POST /api/admin/tournaments/[id]/flyer endpoint does, minus the admin
// session (this runs as a trusted script).
//
//   node scripts/upload-flyers.mjs           # validate token + show plan
//   node scripts/upload-flyers.mjs --execute # upload + update the DB
//
// Run from the project root.

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { put, list } from "@vercel/blob";
import convert from "heic-convert";

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
const BLOB_TOKEN = envVal(".env.local", "BLOB_READ_WRITE_TOKEN");

const MESSAGES = "C:/Users/daddy/CrossDevice/ray's S24+/storage/Pictures/Messages";
const MAP = [
  { file: "IMG_20260910_113647.jpg", name: "Dia de los Dingers", contentType: "image/jpeg" },
  { file: "IMG_20260910_113653.png", name: "BASE Arkansas Fall STATE", contentType: "image/png" },
  { file: "IMG_20260910_113655.heic", name: "Battle in the Bluff", heic: true },
  { file: "IMG_20260910_113713.png", name: "THE HOWLER", contentType: "image/png" },
];

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

async function main() {
  if (!BLOB_TOKEN || !/^vercel_blob_rw_/.test(BLOB_TOKEN)) {
    throw new Error("BLOB_READ_WRITE_TOKEN missing or malformed in .env.local");
  }

  // Validate the token against the store.
  const probe = await list({ token: BLOB_TOKEN, limit: 1 });
  console.log(`Blob token OK — store reachable (${probe.blobs.length >= 0 ? "list succeeded" : "?"}).`);

  console.log(`\nMode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}\n`);

  for (const m of MAP) {
    const t = await prisma.tournament.findFirst({
      where: { name: m.name },
      select: { id: true, name: true, flyerUrl: true },
    });
    if (!t) {
      console.log(`  SKIP  "${m.name}" — no tournament with that exact name`);
      continue;
    }

    let buf = readFileSync(`${MESSAGES}/${m.file}`);
    let ext = m.file.split(".").pop().toLowerCase();
    let contentType = m.contentType;

    if (m.heic) {
      buf = Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.92 }));
      ext = "jpg";
      contentType = "image/jpeg";
    }

    const sizeKB = Math.round(buf.length / 1024);
    if (!EXECUTE) {
      console.log(`  PLAN  ${m.name} (${t.id})  <-  ${m.file}${m.heic ? " (converted to JPG)" : ""}  ${sizeKB}KB${t.flyerUrl ? "  [replaces existing flyer]" : ""}`);
      continue;
    }

    const blob = await put(`tournament-flyers/${t.id}-${Date.now()}.${ext}`, buf, {
      access: "public",
      token: BLOB_TOKEN,
      contentType,
      addRandomSuffix: false,
    });
    await prisma.tournament.update({ where: { id: t.id }, data: { flyerUrl: blob.url } });
    console.log(`  OK    ${m.name}\n        ${blob.url}`);
  }

  if (!EXECUTE) console.log("\nDRY RUN complete. Re-run with --execute.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
