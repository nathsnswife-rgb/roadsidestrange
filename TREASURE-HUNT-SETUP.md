# Roadside Strange treasure hunt checker

**Development only.** This work is in `feature/treasure-hunt-letter-checker`, not the live site.

## Built so far
- `treasure-hunt.html`: responsive 16-letter form; marks correct/incorrect clues, saves correct guesses in local browser storage.
- `treasure-hunt-worker.js`: private server-side answer validation, only attempts filled clues, and a launch-date gate.
- **Three checked guesses per clue, per UTC day, per network address**. A Cloudflare Durable Object uses transactional storage, preventing simultaneous requests from racing the counter.
- Previously solved clues stay solved on the server and don't cost new attempts.
- The browser never receives the answer key.

## Cloudflare setup (not deployed yet)
1. From a local checkout of this branch, install Wrangler, then deploy with `npx wrangler deploy --config wrangler.hunt.jsonc`. This config creates the `HUNT_LIMITER` Durable Object with SQLite storage.
2. Configure `ANSWER_LETTERS` **as a Cloudflare secret**, exactly 16 capital letters in clue order. This must be verified against the final riddles before launch. **Never include it in GitHub, frontend JavaScript, or `vars`.**
3. Configure a long random `IP_HASH_SECRET` **as another Cloudflare secret**. Example setup commands:
   `npx wrangler secret put ANSWER_LETTERS --config wrangler.hunt.jsonc`
   `npx wrangler secret put IP_HASH_SECRET --config wrangler.hunt.jsonc`
4. Confirm launch time and timezone, then change `OPEN_AT` in `wrangler.hunt.jsonc` if needed (currently example November 15, 2026 at midnight Arizona time).
5. Confirm allowed website origins in `ALLOWED_ORIGIN`.
6. Update the empty `API_URL` constant in `treasure-hunt.html` to the deployed Worker URL.
7. Test correct, incorrect, repeated, three-wrong lockout, simultaneous guesses, across-day reset, and mobile layout. Use a disposable **test answer key** for testing first; never burn live contestants' attempts.
8. Link the checker from the website only after you're happy with the tests and merge the changes.

## Limits and fairness
- Attempts are **per IP address**, not per actual person. Two people on the same Wi-Fi share a limit; someone switching networks can get extra guesses. For real per-player fairness, add sign-in and a stable user ID rather than relying on IPs.
- The public checker gives letter-level feedback and does not reveal the final anagram or award prizes. A separate final-answer submission and timestamped winner-claim process is still needed.
- The client stores solved letters for convenience. Server-side state determines whether a clue was already solved, but clients can clear their own display.
- Rate limiting is enforced using Durable Objects, but this has **not yet been integration-tested in Cloudflare**.

## No live-site changes yet
The production website remains untouched; the draft pull request is intentionally unmerged.
