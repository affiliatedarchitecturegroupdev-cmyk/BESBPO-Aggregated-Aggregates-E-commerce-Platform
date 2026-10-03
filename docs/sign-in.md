# Sign-in options

Six ways to sign in or create an account (`/account/login`, `/account/register`):

| Option | Status | Switched on by (API service env) |
|---|---|---|
| Email + password | Always on | — |
| Google | When configured | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Microsoft (personal and work accounts) | When configured | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| X | When configured | `X_CLIENT_ID`, `X_CLIENT_SECRET` |
| Facebook | When configured | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` |
| Instagram | When configured | `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` |

Until a provider's ID and secret are set, its button shows greyed out as
"Coming soon". Set them on **aggregates-store-api → Environment** and
redeploy; nothing else changes.

## Redirect URI to register with each provider

Each provider needs the storefront's callback URL registered exactly, with
your live domain:

```
https://<storefront domain>/api/auth/oauth/<provider>/callback
```

for example `https://aggregates.store/api/auth/oauth/google/callback`.
`<provider>` is `google`, `microsoft`, `x`, `facebook` or `instagram`. While
the store runs on Render's address, use `https://aggregates-store-web.onrender.com/...`
(and add the custom-domain one when you switch). Set `NEXT_PUBLIC_SITE_URL`
on the **web** service so the callback always uses the right domain.

## Where to create each app

- **Google** — Google Cloud Console → APIs & Services → Credentials → OAuth
  client ID (Web application). Scopes: `openid email profile`.
- **Microsoft** — Microsoft Entra admin centre → App registrations → New
  registration. Supported account types: *Accounts in any organizational
  directory and personal Microsoft accounts*. Add a Web redirect URI and a
  client secret.
- **X** — developer.x.com → your app → User authentication settings: OAuth 2.0,
  *Web App (confidential client)*, permission *Read*, and request email access
  so X shares the account's confirmed email. Scopes used:
  `users.read tweet.read users.email`.
- **Facebook** — developers.facebook.com → Create app → *Authenticate and
  request data from users with Facebook Login*. Add the redirect URI under
  Facebook Login → Settings. The app must be switched to Live mode (needs a
  privacy-policy URL: `https://aggregates.store/legal/privacy-policy`).
- **Instagram** — developers.facebook.com → Create app → *Instagram API with
  Instagram Login*. **Only Instagram professional (Business or Creator)
  accounts can sign in this way** — that's Meta's rule; personal Instagram
  accounts can't. Instagram never shares an email address, so these
  customers add one on a short "Finish signing up" step.

## How accounts are matched

- A returning provider account signs straight into the account it created.
- If the provider vouches for the email (Google verified, Facebook, X
  confirmed email), it's linked to an existing account with that email.
- Microsoft's email isn't verified for every account type, so it never links
  to an existing account by itself; the person is asked to sign in with their
  password instead. (Prevents account takeover.)
- No email shared (Instagram, some X accounts) → the person adds one; it must
  not already belong to an account.
- We only receive name, account ID and email. Nothing is ever posted.

The flow (authorization code; PKCE for Google, Microsoft and X) runs through
the storefront, like every other API call: `apps/web/src/app/api/auth/oauth/`
and `apps/api/src/auth/oauth/`.
