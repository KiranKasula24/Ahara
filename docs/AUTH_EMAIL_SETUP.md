# Ahara authentication email setup

Ahara sends passwordless sign-in email itself through Resend. Supabase does not send the user-facing sign-in email; it only issues and verifies the short-lived credential and provides the signed session used by database RLS.

## 1. Configure Resend

1. Create a Resend API key.
2. Add these server-only values to the deployment environment (and `.env.local` for local testing):

```dotenv
APP_URL=https://app.yourdomain.com
RESEND_API_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

The app defaults to Resend's built-in test sender, so `AHARA_EMAIL_FROM` is optional. With that test sender, Resend delivers only to the email address associated with the Resend account. When you later need to email other users, set `AHARA_EMAIL_FROM` to an address on a Resend-verified domain.

## 2. Configure Supabase redirect URLs

In Supabase Authentication URL Configuration, add:

```text
https://app.yourdomain.com/auth/callback
```

Also add your local development callback URL if needed, for example `http://localhost:3000/auth/callback`.

## Result

The Ahara `/api/auth/request` endpoint creates a server-side passwordless credential and sends the branded Resend email containing both the secure sign-in link and one-time code. `/api/auth/verify` validates the code and creates the normal secure Supabase session cookie.
