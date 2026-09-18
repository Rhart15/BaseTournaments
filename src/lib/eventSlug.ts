// Shared slug logic for the event wizard's Details step -- auto-generates
// from name + location + year, editable by the admin, unique per Tournament.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildEventSlugBase(opts: {
  name: string;
  city?: string | null;
  startDate: Date;
}): string {
  // `city` is stored as free text and already includes the state (e.g.
  // "Conway, AR" or "Texarkana, TX") -- Tournament.state is a separate,
  // often-stale default and would double up or contradict it, so it's
  // deliberately not used here.
  const parts = [opts.name, opts.city, String(opts.startDate.getFullYear())].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return slugify(parts.join(" "));
}

/** Appends -2, -3, ... until `candidate` doesn't collide with another Tournament's slug. */
export async function ensureUniqueSlug(
  prisma: import("@prisma/client").PrismaClient,
  base: string,
  excludeId?: string
): Promise<string> {
  let candidate = base || "event";
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const collision = await prisma.tournament.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!collision) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
