# Roadside Strange treasure hunt letter checker

This is a **staged feature branch**. It is **not live** on roadsidestrange.com.

## What it does
- `treasure-hunt.html`: 16 letter fields, individual feedback and local persistence of verified guesses.
- `treasure-hunt-worker.js`: private answer validation, three incorrect-or-correct submissions per clue per **UTC day**, and a launch gate.
- The public page never contains the answer key. Only filled clues are sent.
- Wrong guesses identify the clue number and remaining attempts, not the answer.

## Before launch
1. Create a Cloudflare Worker using `treasure-hunt-worker.js`; bind a Cloudflare KV namespace named `ATTEMPTS`.
2. Add **secret** `ANSWER_LETTERS` = precisely 16 A–Z characters, **in clue order** (not necessarily the unscrambled final word). Do not commit or paste the answer key in HTML or GitHub.
3. Add **secret** `IP_HASH_SECRET` = a long randomly generated string.
4. Set `ALLOWED_ORIGIN` = `https://roadsidestrange.com` (include `https://www.roadsidestrange.com` if needed).
5. Set `OPEN_AT` = launch timestamp in ISO 8601, e.g. `2026-11-15T00:00:00-07:00`. This is an example; confirm actual launch time.
6. Change the empty `API_URL` constant in `treasure-hunt.html` to the deployed Worker URL.
7. Test with a private 16-letter test key before switching to actual answers, including wrong guesses, three-attempt lockout, next-day reset, and mobile display.
8. Add a link to `treasure-hunt.html` from the intended public landing page, then merge the branch only when you're ready to publish.

## Important limitations
Cloudflare KV has eventual consistency and read-modify-write updates are not atomic. Concurrent submissions can slip past the three-attempt cap. For a **strict** prize-contest limit, replace the KV counter with a Durable Object or transactional database before launch. Limits are IP-based; players sharing an internet connection may share attempts, and changing networks can bypass the cap. A user-authenticated identity and atomic server counter would be required for a meaningful per-person enforced cap.

The private answer key has not been provided to this implementation. It deliberately fails closed and refuses to count attempts until configured. This is a **letter checker**, not a final prize submission or winner-claim endpoint.
