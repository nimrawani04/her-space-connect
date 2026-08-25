# Reliable Google OAuth session handoff

## Implementation
- Route every full-page Google OAuth return through the public `/auth/callback` page instead of the homepage.
- Store the intended post-auth destination in durable same-origin browser storage so it survives both popup and full-page flows.
- Add one shared session-handoff helper that waits for the authenticated user, consumes the saved destination safely, and redirects only after session propagation completes.
- Use the same helper from the sign-in page, callback route, and root auth listener to eliminate competing redirect behavior.
- Keep `/dashboard` as the safe fallback; never use the homepage as an OAuth completion destination.

## Validation
- Verify the sign-in action uses the public callback URL.
- Verify popup completion reaches `/dashboard` after session confirmation.
- Verify a simulated full-page callback with an established session reaches `/dashboard` and clears pending state.
- Verify signed-out callback attempts return to `/auth`, not `/`.
