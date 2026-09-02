# BASE Events — tournament site rebuild

Rebuild of basetournament.com for Hartfelt Creations. Next.js (App
Router) + Prisma/Postgres + Stripe + a pool-play-into-bracket engine.

## What's built

- Public site: homepage, tournament listings, tournament detail with
  registration form
- Stripe Checkout integration for team registration (`/api/checkout`)
  and a webhook (`/api/webhooks/stripe`) that marks a team paid
- Database schema (`prisma/schema.prisma`) covering tournaments,
  venues, divisions, pools, registrations, and games
- Pool-play standings + seeding logic (`src/lib/brackets.ts`)
- **Bracket generation**: `/admin/tournaments/[id]` has a "Generate
  bracket" button (enabled once every pool game is marked final) that
  seeds a single-elimination bracket from final standings and creates
  every round's games, wired so a round's winner auto-fills the next
  round's slot
- **Score entry**: admins enter a score on any pool or bracket game;
  saving it updates pool standings and, for bracket games, advances
  the winner into the next round automatically
- **Admin login**: `/admin/login`, a single shared password
  (`ADMIN_PASSWORD` in `.env`) gates `/admin/*` and the score-entry
  API via `src/middleware.ts`. This is a fast, real gate for a couple
  of BASE staff — see "Not built yet" for when to upgrade it.
- Public bracket/standings view page per division
- Seed script (`prisma/seed.ts`) with one sample tournament, division,
  and six teams with pool records, so the site isn't empty on first
  run
- Brand system pulled from the current BASE logo: navy `#0b0f2e`, red
  `#c41e2e`, softball gold `#f4c430`, steel gray, cream background.
  Oswald for headlines, Inter for body.

## Not built yet

- **Per-user admin accounts.** The current gate is one shared
  password for anyone on staff. Fine for now; move to Clerk or
  Auth.js with individual logins once more than 2–3 people need
  access, so you get audit trails and can revoke one person without
  changing everyone's password.
- **Double-elimination brackets.** Single elimination is fully wired;
  double elim needs a losers-bracket slot map, which is a bigger
  addition to `generate-bracket/route.ts`.
- Team/coach login to view their own schedule.
- Field/time-slot auto-scheduler for pool play (games currently need
  `startTime`/`fieldName` set manually or via a script).
- Content pages (About, Rules, Venues, Director Recruitment) — carried
  over as nav links but not built out.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env`:
   - `DATABASE_URL` — a free Neon or Supabase Postgres instance works
     well to start
   - Stripe **test** keys from the Stripe dashboard
   - `ADMIN_PASSWORD` — pick anything for now, this is what gets you
     into `/admin`
3. `npx prisma generate` then `npx prisma db push` to create tables.
   - Note: this was scaffolded in a sandboxed environment that
     couldn't reach `binaries.prisma.sh` to download the Prisma
     engine, so these two commands haven't been run yet — run them on
     your machine with normal internet access.
4. `npx prisma db seed` to load sample tournament data.
5. `npm run dev`, open `http://localhost:3000`.
6. Visit `/admin/login`, sign in with your `ADMIN_PASSWORD`, then open
   the sample tournament to try scoring pool games and generating a
   bracket.
7. For Stripe webhooks locally: `stripe listen --forward-to
   localhost:3000/api/webhooks/stripe`.

## Suggested next steps, in order

1. Run the setup above and click through the seeded tournament —
   score a few pool games, hit "Generate bracket," score a bracket
   game, confirm the winner advances.
2. Replace placeholder venue/about/rules content with real BASE copy.
   Confirm the exact brand hex values against the original logo file
   if you have the vector/PNG — the colors here were read off a
   screenshot.
3. Add the field/time-slot scheduler for pool play.
4. Move admin auth to per-user accounts once ready.
5. Deploy: Vercel for the app, Neon/Supabase/RDS for Postgres.
