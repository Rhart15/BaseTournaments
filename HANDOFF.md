# Hotfix: checkout was crashing for logged-in users

## The bug

Any logged-in coach trying to register a team right now gets a server
error instead of completing checkout. Cause: the saved-payment-methods
feature (Tier 2) tries to create a Stripe Customer on every checkout for
a logged-in user, and since Stripe is still on placeholder keys, that
call fails -- and it wasn't wrapped in error handling, so it crashed the
whole request instead of just skipping that one convenience feature.

This affects real usage right now, not just testing -- worth pushing
this before anyone else tries to register while logged in.

## The fix

Three checkout routes now catch a Stripe customer-creation failure and
fall back gracefully:
- `/api/checkout` and `/api/checkout/cart` -- proceed without a saved
  customer (same as a guest checkout) instead of crashing.
- `/api/checkout/plan` -- a payment plan genuinely needs a saved card
  for the automatic later installments, so this one returns a clear
  error message ("Couldn't set up automatic billing right now, try Card
  instead") rather than a raw crash.

## 1. Extract

```powershell
Expand-Archive -Path "$HOME\Downloads\hotfix-package.zip" -DestinationPath "." -Force
```

## 2. Commit and push

No schema changes this time, no `prisma generate`/`db push` needed --
just code.

```powershell
git add -A
git status
```

Should show exactly 3 modified files. If that looks right:

```powershell
git commit -m "Fix checkout crash when Stripe customer creation fails for logged-in users"
git push
```
