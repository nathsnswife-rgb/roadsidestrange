# Roadside Strange treasure hunt checker

**Development only.** This work is in `feature/treasure-hunt-letter-checker`, not the live site.

## Built so far
- `treasure-hunt.html`: 16-entry complete-sequence checker with a count of incorrect positions, but no individual letter identification.
- `treasure-hunt-worker.js`: private validation of one 16-letter sequence; **three complete submissions per UTC day per network address**.
- Durable Object transactional counters prevent parallel requests from evading the quota.
- Correct solutions persist on the server for that network address.
- The browser never receives the real answer key. For local visual testing only, the hidden website preview uses a public dummy answer `COUNTERTERRORISM` and an easily reset browser-based three-try limit. That preview is **not a secure prize checker**.

## Cloudflare setup (not deployed yet)
1. From a local checkout of this branch, install Wrangler, then deploy with `npx wrangler deploy --config wrangler.hunt.jsonc`. This config creates the `HUNT_LIMITER` Durable Object with SQLite storage.
2. Configure `ANSWER_LETTERS` **as a Cloudflare secret**, exactly 16 capital letters in clue order. This must be verified against the final riddles before launch. **Never include it in GitHub, frontend JavaScript, or `vars`.**
3. Configure a long random `IP_HASH_SECRET` **as another Cloudflare secret**. Example setup commands:
   `npx wrangler secret put ANSWER_LETTERS --config wrangler.hunt.jsonc`
   `npx wrangler secret put IP_HASH_SECRET --config wrangler.hunt.jsonc`
4. Confirm launch time and timezone, then change `OPEN_AT` in `wrangler.hunt.jsonc` if needed (currently example November 15, 2026 at midnight Arizona time).
5. Confirm allowed website origins in `ALLOWED_ORIGIN`.
6. Update the empty `API_URL` constant in `treasure-hunt.html` to the deployed Worker URL.
7. Test a full 16-letter correct and wrong sequence, an incomplete submission (must not consume attempts), three-wrong lockout, simultaneous guesses, across-day reset, and mobile layout. Use a disposable **test answer key** for testing first; never burn live contestants' attempts.
8. Link the checker from the website only after you're happy with the tests and merge the changes.

## Limits and fairness
- Attempts are **per IP address**, not per actual person. Two people on the same Wi-Fi share a limit; someone switching networks can get extra guesses. For real per-player fairness, add sign-in and a stable user ID rather than relying on IPs.
- The public checker reports whether the **whole sequence** is correct, or how many positions are incorrect, without identifying individual letters, the final anagram, or award prizes. A separate final-answer submission and timestamped winner-claim process is still needed.
- The client stores solved letters for convenience. Server-side state determines whether a clue was already solved, but clients can clear their own display.
- Rate limiting is enforced using Durable Objects, but this has **not yet been integration-tested in Cloudflare**.

## No live-site changes yet
The production website remains untouched; the draft pull request is intentionally unmerged.
