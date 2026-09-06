# Payment plans batch — how to merge, migrate, and push

This zip is smaller than the last two -- it only contains the 11 files
touched by the new payment-plan feature, since Tier 1 and Tier 2 are
already live on your site.

## What's in this batch

Coaches who are logged in can now choose "Payment plan" at checkout
(2-4 installments, 30 days apart). The first installment charges
immediately; the rest are charged automatically to the same saved card
by a scheduled job that runs once a day. If an automatic charge fails
(card declined, expired, etc.), the coach sees it on their registration
page with a "Retry payment" button.

## 1. Extract this zip

```powershell
Expand-Archive -Path "$HOME\Downloads\plan-package.zip" -DestinationPath "." -Force
```

## 2. Verify it landed

```powershell
Select-String -Path "prisma\schema.prisma" -Pattern "PaymentInstallment"
```
Should show real matches.

## 3. Update the database schema

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx prisma generate
npx prisma db push
```

## 4. One-time setup: a CRON_SECRET

The daily job that charges later installments needs a secret so nobody
else can trigger it early. Generate one and add it in **Vercel**, not
just locally (this one has to exist on Vercel itself, since that's
where the scheduled job actually runs):

```powershell
$secret = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
Write-Output $secret
```

Copy the value it prints, then in the Vercel dashboard: your project →
**Environment Variables** → add a new one named `CRON_SECRET` with that
value, for Production. (Also add it to your local `.env.local` as
`CRON_SECRET=<same value>` if you want to test the cron endpoint locally,
though that's optional -- it only really matters once deployed.)

## 5. Test locally

```powershell
npm run dev
```

Log in as a coach account, go to any tournament's registration form, and
check "Payment plan" now shows up as an option with an installment-count
selector. You don't need to actually complete a real Stripe payment to
confirm the UI renders correctly.

Stop the server with `Ctrl+C` when done.

## 6. Commit and push

```powershell
git add -A
git status
```

Should show exactly these 11 files as modified/new — nothing else. If
that looks right:

```powershell
git commit -m "Add payment plan installments with automatic scheduled charging"
git push
```

## Worth knowing

- The scheduled job runs once a day (1pm UTC) via Vercel Cron — this is
  configured in `vercel.json`. Vercel's free Hobby plan supports this.
- If a coach's card fails on an automatic charge, nothing emails them
  automatically yet — they'd need to check their registration page to
  see the "Retry payment" button. Worth keeping in mind if a team's
  payment silently fails and nobody notices for a while.
