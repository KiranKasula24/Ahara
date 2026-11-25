# Ahara authentication email setup

Ahara sends passwordless sign-in email itself through Resend. Supabase does not send the user-facing sign-in email; it only issues and verifies the short-lived credential and provides the signed session used by database RLS.

## 1. Configure Resend

1. Verify the sending domain in Resend.
2. Set a sender address on that domain, for example `Ahara <hello@yourdomain.com>`.
3. Add these server-only values to the deployment environment (and `.env.local` for local testing):

```dotenv
APP_URL=https://app.yourdomain.com
RESEND_API_KEY=re_...
AHARA_EMAIL_FROM=Ahara <hello@yourdomain.com>
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

## 2. Configure Supabase redirect URLs

In Supabase Authentication URL Configuration, add:

```text
https://app.yourdomain.com/auth/callback
```

Also add your local development callback URL if needed, for example `http://localhost:3000/auth/callback`.

## Result

The Ahara `/api/auth/request` endpoint creates a server-side passwordless credential and sends the branded Resend email containing both the secure sign-in link and one-time code. `/api/auth/verify` validates the code and creates the normal secure Supabase session cookie.
