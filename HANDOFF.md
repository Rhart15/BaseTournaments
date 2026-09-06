# Tier 1 + Tier 2 batch — how to merge, migrate, and push

This zip contains 42 files (every changed/new file across both Tier 1 and
Tier 2), same folder structure as your repo. Extracting it will re-apply
Tier 1 (safe, identical content to what's already in your working
directory) and add everything new from Tier 2.

## What's in this batch

**Tier 1:** insurance upload, discount codes, document library, guest
player invites, roster submission & approval.

**Tier 2:** eCheck/ACH payment, saved payment methods, print roster,
multi-event cart checkout.

## 1. Clean up first

Before extracting, make sure there's no leftover `tier1-package` folder:

```powershell
Remove-Item -Recurse -Force ".\tier1-package" -ErrorAction SilentlyContinue
```

## 2. Extract this zip

```powershell
Expand-Archive -Path "$HOME\Downloads\tier2-package.zip" -DestinationPath "." -Force
```

## 3. Verify it landed correctly

```powershell
(Get-Item "prisma\schema.prisma").Length
Select-String -Path "prisma\schema.prisma" -Pattern "DiscountCode|orderGroupId"
```

The file should be a good bit larger than 11726 bytes now (Tier 2 added
more schema fields), and both patterns should show real matches.

## 4. Update the database schema

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx prisma generate
npx prisma db push
```

`db push` should list real changes this time (new `orderGroupId` column,
`stripeCustomerId` on User, etc.) — if it says "already in sync," stop and
check step 3 again before continuing.

## 5. Test locally

```powershell
npm run dev
```

Click through:
- Everything from the original Tier 1 checklist (insurance, discount
  codes, documents, guest player link, roster approval)
- Add a tournament to your cart, add a second one, go to `/cart`, check
  out both together
- On a registration page, check the "Print roster" button opens a clean
  printable view

Stop the server with `Ctrl+C` when done.

## 6. Commit and push

```powershell
git add -A
git status
```

Check the output shows real paths (`src/app/cart/...`, `src/lib/stripe.ts`,
etc.) — **not** another `tier1-package/` folder. If it looks right:

```powershell
git commit -m "Add discount codes, insurance, documents, guest players, roster approval, cart checkout, ACH payments, saved cards, print roster"
git push
```

## One more thing worth knowing

`us_bank_account` (ACH/eCheck) needs to be enabled in your Stripe
dashboard's payment methods settings before it'll actually show up at
checkout — the code change alone isn't enough on Stripe's end. Not
urgent since you're still on placeholder Stripe keys, just flagging it
for whenever you're ready to go live with real payments.
