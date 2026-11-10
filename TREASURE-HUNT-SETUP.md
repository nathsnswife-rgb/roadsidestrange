# Roadside Strange — secure treasure hunt checker

**Status: implementation staged in a draft pull request; the Cloudflare Worker is NOT DEPLOYED and the hidden website preview is still a browser-only demo.**

## How it works
- Player signs in with Google through Firebase Authentication. Their verified email account is required for submissions.
- The browser submits **all 16 letters** plus a Firebase ID token.
- Cloudflare validates the token signature against Google's public signing keys and checks issuer, project ID, expiration, and email verification before accepting the account UID.
- The Durable Object counts **three complete sequence attempts per UTC day per verified Firebase UID**, with transactional updates. Moving to another IP/VPN does **not** reset the same account's guesses.
- A wrong attempt reports **how many letter positions are incorrect**, not which ones. A correct answer is remembered per account.
- Real ANSWER_LETTERS stays a Worker secret and is never sent to the browser.
- Local tests: `node --experimental-default-type=module treasure-hunt-test.mjs`. Workflow: `.github/workflows/treasure-hunt-tests.yml`.

## Activation steps (requires access to user's Firebase and Cloudflare dashboards)
1. Confirm which Firebase project will own player accounts. In Firebase Authentication, **enable Google sign-in** and add `roadsidestrange.com` to the authorized domains. Use the existing project only with the owner's agreement, since this will share that project's auth user database.
2. Copy the **public Firebase Web App config** into `treasure-hunt-config.js` (apiKey, authDomain, projectId, appId). The same projectId must be set as `FIREBASE_PROJECT_ID` in `wrangler.hunt.jsonc`. These config values are NOT the answer-key secret.
3. Create or access a Cloudflare Workers account. Run `npx wrangler login` and `npx wrangler deploy --config wrangler.hunt.jsonc` from a local checkout of this feature branch. The config contains a SQLite-backed Durable Object HUNT_LIMITER.
4. Set the real 16-letter clue-order key privately: `npx wrangler secret put ANSWER_LETTERS --config wrangler.hunt.jsonc`. **Verify this exact key first against the final clues**, not against the unscrambled final word.
5. Set `HUNT_CONFIG.apiUrl` in `treasure-hunt-config.js` to the deployed Worker base URL, leaving off `/check`. Ensure `ALLOWED_ORIGIN` matches the domain serving the page.
6. Confirm the contest opening time; `OPEN_AT` currently defaults to **2026-11-15 at midnight Arizona time**. For private prelaunch tests use a separate Worker name/environment and dummy answer, rather than activating the live checker early.
7. Verify that Google sign-in works on desktop and phone; incomplete input uses no attempt; a wrong sequence returns a position count; 3 bad guesses lock out the account; other signed-in account has its own counter; VPN switching doesn't reset a signed-in account; successful completion persists.
8. Bring the approved visual styling from the hidden test page into the production checker, add a public link when ready, and merge only after testing.

## Hidden visual demo
The current hidden site `/monster-bash-moonlit-crypt-7f42/` uses the **dummy test string** `COUNTERTERRORISM` and an easily reset browser-only limit. It remains untouched by this backend work and is not suitable for prize enforcement.

## Limitations and fairness
- A player can still create additional Google/Firebase accounts to bypass an account-only daily quota. For a cash-prize event, consider a one-registration-per-person rule, organizer verification before awarding, monitoring for suspicious submissions, and/or an extra challenge mechanism. Verified email is not proof of a unique human.
- Cloudflare deployment requires account access and may have usage charges. No Cloudflare account, Worker, Firebase config, or live secret has been provisioned in this session.
- This checker alone does NOT log a unique timestamped final-word prize claim. Build a separate verified winner submission and audit trail before launch.
