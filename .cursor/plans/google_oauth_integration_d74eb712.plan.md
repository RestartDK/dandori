---
name: Google OAuth Integration
overview: Add Google OAuth authentication to Better Auth with account selection prompt and Google Calendar read/write scopes, then wire up existing Google buttons in the frontend.
todos:
  - id: configure-auth-provider
    content: Add Google OAuth provider to packages/auth/src/index.ts with calendar scopes
    status: pending
  - id: update-turbo-env
    content: Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_URL to turbo.json
    status: pending
  - id: wire-signin-button
    content: Connect Google button in sign-in-form.tsx to authClient.signIn.social
    status: pending
  - id: wire-signup-button
    content: Connect Google button in sign-up-form.tsx to authClient.signIn.social
    status: pending
---

# Add Google OAuth with Calendar Scopes

## Overview

Integrate Google OAuth into your existing Better Auth setup with:

- Account selection prompt (always show chooser)
- Refresh token persistence (offline access)
- Google Calendar read/write scopes for future calendar sync

## Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Server as Server/BetterAuth
    participant Google

    User->>Frontend: Click "Login with Google"
    Frontend->>Server: signIn.social({ provider: "google" })
    Server->>Google: OAuth redirect with scopes
    Google->>User: Account selector + consent
    User->>Google: Select account + grant access
    Google->>Server: Callback with tokens
    Server->>Server: Store tokens in account table
    Server->>Frontend: Session cookie
    Frontend->>User: Redirect to home
```



## Implementation Steps

### 1. Configure Google OAuth Provider

Update [`packages/auth/src/index.ts`](packages/auth/src/index.ts) to add the Google social provider with:

- `prompt: "select_account"` - Always show account chooser
- `accessType: "offline"` - Get refresh tokens
- `scope` - Include Google Calendar read/write permissions
```ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    prompt: "select_account",
    accessType: "offline",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events"
    ],
  },
},
```




### 2. Add Environment Variables

Add to server environment (referenced in [`turbo.json`](turbo.json)):

- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `BETTER_AUTH_URL` - Base URL for OAuth callback construction

Update `turbo.json` to include these in the env array for the server task.

### 3. Wire Up Frontend Google Buttons

Update [`sign-in-form.tsx`](apps/web/src/components/sign-in-form.tsx) and [`sign-up-form.tsx`](apps/web/src/components/sign-up-form.tsx):

```ts
const handleGoogleSignIn = async () => {
  await authClient.signIn.social({
    provider: "google",
  });
};
```

Attach to existing Google buttons via `onClick={handleGoogleSignIn}`.

### 4. Google Cloud Console Setup (Manual)

You'll need to:

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Enable the Google Calendar API
3. Add authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google` (dev)
- `https://your-domain.com/api/auth/callback/google` (prod)

## Files to Modify