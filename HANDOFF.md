# Deploy runbook — admin hierarchy + per-admin Stripe Connect payouts

Do these in order. Steps 1–4 are one-time; 5 is per-director going forward.

## 1. Stripe dashboard (do first, before deploy)

- Enable **Connect** on the BASE Stripe account (Settings → Connect → Get started;
  platform profile).
- Add these events to the existing webhook endpoint
  (`/api/webhooks/stripe`): `account.updated`, `charge.refunded`,
  `charge.refund.updated`. (It already has the `checkout.session.*` events.)
- No new env vars — Connect uses the existing `STRIPE_SECRET_KEY`.

## 2. Push the schema to production

```
npx prisma generate
npx prisma db push
```

Fully additive — new nullable columns / defaults / one new `Refund` table.
No data is dropped. (SQL preview was reviewed.)

## 3. Deploy the code (git push / Vercel)

## 4. Create the admin accounts + assign existing tournaments

```
npx tsx scripts/setup-admin-hierarchy.ts            # preview
npx tsx scripts/setup-admin-hierarchy.ts --execute  # apply
```

This:
- makes **Ray, Shannon, Ashley** lead admins, each with a one-time
  password printed once (send them securely; they change it on first
  sign-in at `/admin/settings`),
- assigns **all existing tournaments to Shannon** — he reassigns the real
  organizer per tournament from the tournament's Info tab,
- removes the old shared-password admin login entirely.

> ⚠️ After this runs, **every tournament stops taking registrations** until
> its owner finishes Stripe onboarding (step 5). Shannon should onboard
> first so the backfilled tournaments come back online.

## 5. Each admin: finish Stripe onboarding

`/admin` → **Payouts** (or the yellow banner) → **Set up payouts** →
complete Stripe's hosted flow. Once "Accepting registration payments"
shows Yes, that admin's tournaments can take registrations again.
Registration fees land in that admin's connected account, minus the flat
**$15/team** platform fee which stays with the BASE platform account.

## Refunds

`/admin/tournaments/<id>` → **Registrations & refunds**. Lead admins can
refund any team; a director can refund teams in their own tournaments.
Full refund returns everything incl. the $15 (BASE absorbs it); partial
refunds keep the $15. Payment-plan registrations are full-refund only.
