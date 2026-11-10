# Roadside Strange Treasure Hunt — Project Checkpoint
Updated: 2026-11-09 (America/Phoenix)

This document records the decisions made and implemented in the treasure hunt project. **No secret contest answer or private credentials belong in this public repository.**

## Core contest concept
- Sixteen paranormal/location-based riddles, one released daily in the Roadside Strange app using the previously built treasure-hunt map pin.
- Intended schedule: November 15 through November 30, 2026 (Arizona dates), with all previous clues remaining visible as the hunt progresses; implement and test the timed release mechanism separately.
- Clues should be **exclusive to the app** to encourage installs; available to free users, not Premium-gated. The website advertises the hunt, rules, and app download links.
- Main prize: $100; second prize discussed as a lifetime premium code. Confirm exact official rules before public launch.
- The sixteen ordered clue letters are entered in the checker; players subsequently unscramble them into a final word. The secret keys and sign details are **not** included here.

## Hidden webpage: public preview, NOT competition ready
- Website repository: `nathsnswife-rgb/nathsnswife-rgb.github.io` (main).
- Preview path: `monster-bash-moonlit-crypt-7f42/index.html`
- URL: `https://roadsidestrange.com/monster-bash-moonlit-crypt-7f42/`
- The original Monster Bash test was displaced **temporarily** at this obscure path and can be recovered from earlier Git history. Hidden/unlisted URL is not password protection.
- Approved visual style: dramatic purple-and-black paranormal design, gold accents, 16 illuminated letter tiles, mobile responsive.
- Preview checker takes all 16 ordered letters at once; reports **how many positions are wrong**, not which ones; 3 attempts per UTC day in browser localStorage; Reset Test button clears simulated lockout and letters.
- Preview uses **dummy answer only**. Never put the actual competition answer in public HTML, JavaScript or a repository. The real clue sequence was held in a separate locally downloaded offline test file, not deployed to site.
- Browser limit is trivially bypassed by clearing storage; VPN switching is not even needed. User elected to retain this lightweight version for now instead of adding accounts/server-side enforcement.
- The hidden website preview now also shows a styled **Claim Your Discovery** form with fields full name, email, and final word; submit is deliberately display-only — no data sent or stored.

## Final-answer submission decision (November 9)
- User prefers **automatic email submissions instead of a contest entrant database**.
- Recipient: `angel@roadsidestrange.com`.
- Source prepared at `treasure-hunt-email/Code.gs` and `treasure-hunt-email/EntryForm.html` in this branch; instructions at `treasure-hunt-email/README.md`.
- The real implementation is a standalone **Google Apps Script web app** with purple Roadside Strange styling, sending via MailApp from user's Google account. It captures name, email, final word, submission ID, and **server-generated UTC and Arizona timestamps**.
- Email submissions are kept in the destination mailbox (and sender Sent mail), not a separate contest database. It does not validate whether the submitted final word is right; organizer judges.
- The Apps Script project has **NOT** been created/deployed in the user's Google account yet, has **NOT** been connected to the website, and **no real end-to-end submission test has occurred**. User plans to test over the next few days.
- The Apps Script currently uses TEST_MODE=true and labels submitted emails TEST ENTRY. Default final-entry opening time in the script is Nov 30, 2026 00:00 Arizona. Confirm schedule; deploy and test privately, then change to TEST_MODE=false and redeploy existing web-app deployment.
- Google Apps Script MailApp quota is independent of Resend quota; consumer Gmail commonly maxes at 100 recipients per day. There is only lightweight bot abuse control, not robust anti-spam.
- Inbox timestamps / delivery order should NOT be treated as a guaranteed authoritative first-entry ranking. Define how prize submissions/winners will be evaluated, and how personal data is handled.
- The real form needs a server sending step; do not put any Resend API key in site JavaScript.

## Existing email service
- Connected Resend account already has verified domain `roadsidestrange.com` and sending enabled; on Nov 9 allowance was 100 emails/day and 3,000/month. Receiving via Resend for this domain was not enabled.
- Considering the user's desire not to create more accounts, the selected initial plan is to use existing Google Apps Script/MailApp for incoming contest entry notification, rather than requiring Cloudflare/Resend API deployment.

## Alternative secure checker work (staged only; NOT deployed)
- `treasure-hunt-worker.js`, `wrangler.hunt.jsonc`, `treasure-hunt.html`, `treasure-hunt-config.js` were prepared in this feature branch for Cloudflare Workers + Firebase Authentication, with per-account 3 guesses/day using a Durable Object and count of incorrect positions.
- GitHub Actions checker unit tests passed (workflow `.github/workflows/treasure-hunt-tests.yml`). This alternative is **not live** and user currently wishes to avoid additional accounts and unnecessary complexity.
- User's Firebase plan is Spark (free). Cloud Functions would require Blaze/billing. User does not currently think they have a Cloudflare account.

## Next practical steps
1. User reviews the Claim Your Discovery styling on the same hidden preview.
2. In existing Google account, create the Apps Script project, paste `Code.gs` and `EntryForm.html`, deploy a TEST_MODE=true web app as owner / access Anyone, grant permissions, and collect its /exec URL.
3. Test a safe fake submission to confirm **actual** mail receipt at destination, email contents, server timestamp, and quota behavior. Add site link only after successful test; keep hidden until launch.
4. Implement and test the special app map pin with timed release of 16 riddles, cumulative clue list, Arizona timezone, and no exposure of future clues in public app assets.
5. Confirm official contest rules, privacy, exact opening time and final winner determination; ensure free-user access.
6. Verify letter extraction from final street signs and the ordered 16-letter answer before publishing any real scoring (do not assume earlier unverified interpretations are guaranteed accurate).

**Note:** This is a project-state record, not proof of production deployment or complete user authentication/security.
