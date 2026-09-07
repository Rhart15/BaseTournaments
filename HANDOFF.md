# Create Shannon's admin login

A standalone script, not a code change -- nothing to commit or push
here. It just adds one new row to your database.

## 1. Extract

```powershell
Expand-Archive -Path "$HOME\Downloads\admin-package.zip" -DestinationPath "." -Force
```

## 2. Run it

```powershell
npx tsx scripts/create-admin.ts
```

It'll print the email and a randomly generated password once, at the
end. Copy both immediately and send them to Shannon somewhere secure
(text, not email in plain text ideally) -- the password isn't saved
anywhere in plain text, so if you lose it before writing it down,
you'd need to run the script again after deleting that account first
(or ask me to help reset it).

## What it creates

- Email: `shannon@basetournament.com`
- Role: full admin (`isSuperAdmin: true`), same level of access as
  your own account -- he'll be able to see everything you can,
  including managing other admins.

If you'd rather Shannon have a lower level of access, let me know and
I can adjust -- right now every admin account has equal permissions
site-wide.
