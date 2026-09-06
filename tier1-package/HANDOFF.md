# Tier 1 batch — how to merge, migrate, and push

This zip contains every new/changed file for Tier 1 (32 files), with the
same folder structure as your repo, so you can extract it straight on top
of your local working copy.

## What's in this batch

- Insurance upload (coach-facing) + "View" link (admin-facing)
- Player background-check upload UI (the backend route already existed)
- Discount codes (admin create/manage) + automatic 10% multi-team discount
- Shared document library (admin upload, public `/documents` page)
- Guest player invite links (generate, share, no-login submit form)
- Roster submission & approval workflow (coach submits, admin approves/rejects)

## 1. Extract into your local repo

From `C:\Users\daddy\Desktop\base-tournament-site-fixed\base-tournament-site`,
with this zip saved somewhere handy (adjust the path to wherever you saved it):

```powershell
Expand-Archive -Path "$HOME\Downloads\tier1-package.zip" -DestinationPath "." -Force
```

This overwrites the files that changed and adds the new ones. Nothing
outside this list is touched.

## 2. Update the database schema

The schema changed (new tables + new columns on existing ones). Run this
on your machine, where `npx prisma generate` can actually reach the internet
(it couldn't in my sandbox — same limitation the project README already
flags):

```powershell
npx prisma generate
npx prisma db push
```

`db push` updates your live Neon database to match the new schema. It's
additive — new tables and new nullable/defaulted columns — so it's safe to
run against your existing data.

## 3. Sanity-check locally

```powershell
npm run dev
```

Worth clicking through once before pushing:
- A team's manage page → Team Info tab → upload a fake insurance file
- Admin → a team row → the new "View" link shows up next to the insurance status
- Admin → Discount codes → create a code → use it on a real tournament's registration form
- Admin → Documents → upload a file → check it shows up at `/documents`
- A registration page → "Generate guest player link" → open the link in an incognito tab → add a player
- A registration page → "Submit roster for approval" → Admin → tournament → "Roster approvals" → approve it

## 4. Push

Once you're happy with it:

```powershell
git add -A
git commit -m "Add insurance upload, discount codes, document library, guest players, roster approval"
git push
```

Vercel will redeploy automatically from the push, same as always.

## One thing to double check

`STRIPE_SECRET_KEY` is already set in Vercel (test/placeholder, per what
you said earlier). No new Stripe env vars are needed for this batch — the
discount logic runs before Stripe is even called.
