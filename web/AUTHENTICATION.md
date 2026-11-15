# Avenza authentication

The dashboard requires an authenticated session. Registration creates a
`USER` account. Users can read dashboard data and submit incident reports.
`ADMIN` accounts can also update and delete incidents. These permissions are
checked by the API; hiding admin buttons in the interface is only a usability
measure.

Passwords are stored as bcrypt hashes. Login issues an eight-hour signed JWT
in an HTTP-only, same-site cookie. The server looks up the account on requests,
so a disabled account or changed role takes effect without trusting role data
from the browser.

## Local setup

`web/.env.local` needs `SESSION_SECRET` with at least 32 bytes of random data.
Generate a value in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Put that value after `SESSION_SECRET=` in the ignored `.env.local` file. Do not
commit it.

## Create an administrator

Register the account normally at `/register`, then promote it from the `web`
directory using the local CLI command:

```powershell
npm run auth:promote-admin -- user@example.com
```

The command updates the role only for an active matching account. Sign out and
sign back in after promotion. Admin role changes are intentionally not exposed
as a public API endpoint.
